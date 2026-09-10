# frozen_string_literal: true

require "net/http"
require "json"
require "base64"

# Liest einen Lieferschein (Bild oder PDF) mit Hilfe der OpenAI-API aus und
# gibt die erkannten Daten als strukturierten Hash zurück (siehe
# docs/ki/json-format.md).
#
# Beispiel:
#   result = LieferscheinExtractor.call(
#     io:           File.open("lieferschein.pdf", "rb"),
#     content_type: "application/pdf"
#   )
#   result["kunde"]["name"]           # => "Muster AG"
#   result["positionen"].first["menge"] # => 12.0
#
# Der API-Key kommt aus den Rails-Credentials (`openai.api_key`) oder aus der
# Umgebungsvariable `OPENAI_API_KEY`. Er darf NIE im Code oder in Git stehen.
class LieferscheinExtractor
  class Error < StandardError; end
  class ConfigurationError < Error; end
  class ApiError < Error; end
  class UnsupportedTypeError < Error; end

  # Vision-fähiges Modell mit Unterstützung für Structured Outputs.
  # Per ENV übersteuerbar (z. B. "gpt-4o-mini" für günstigere Tests).
  MODEL = ENV.fetch("OPENAI_MODEL", "gpt-4o-2024-08-06")
  ENDPOINT = URI("https://api.openai.com/v1/responses")

  # Sicherheitsnetz gegen zu grosse / teure Antworten.
  MAX_OUTPUT_TOKENS = 4_000
  OPEN_TIMEOUT = 10
  READ_TIMEOUT = 120

  SYSTEM_PROMPT = <<~PROMPT.freeze
    Du bist ein Assistent, der Lieferscheine (Bilder oder PDF) ausliest und die
    enthaltenen Daten strukturiert zurueckgibt.

    Aufgabe:
    - Lies den Lieferschein sorgfaeltig und extrahiere ausschliesslich
      Informationen, die tatsaechlich im Dokument sichtbar sind.
    - Gib das Ergebnis exakt im vorgegebenen JSON-Schema zurueck.

    Regeln:
    1. Erfinde nichts. Fehlt eine Angabe oder ist sie unleserlich, setze den
       Wert auf null (bzw. eine leere Liste bei "positionen").
    2. Lieferdatum: Wandle jedes Datum in das Format YYYY-MM-DD um. Erkenne
       schweizerische/deutsche Schreibweisen (z. B. 03.09.2026, 3. Sept. 2026).
       Ein reines Bestell-, Druck- oder Rechnungsdatum ist KEIN Lieferdatum
       -> dann lieferdatum = null.
    3. Kunde = Empfaenger der Ware, nicht der Lieferant/Absender.
    4. Weichen Rechnungs- und Lieferadresse ab, gehoert die Warenempfaenger-
       Adresse in "lieferadresse" und die Kundenadresse in "kunde.adresse".
       Gibt es nur eine Adresse, verwende sie fuer beide Felder.
    5. Mengen: nur die Zahl (Punkt als Dezimaltrennzeichen). Die Einheit
       (z. B. "Stk", "kg", "m", "Palette") gehoert separat in "einheit".
    6. "bezeichnung" ist die Artikelbezeichnung so, wie sie auf dem Lieferschein
       steht, ohne die Artikelnummer.
    7. Werte unveraendert in der Sprache des Dokuments uebernehmen.
    8. Trage in "warnungen" kurze Hinweise ein, wenn etwas unsicher/unleserlich
       war oder das Dokument offensichtlich kein Lieferschein ist.
  PROMPT

  USER_INSTRUCTION = "Hier ist der Lieferschein. Extrahiere die Daten gemaess Schema."

  # Wiederverwendbares Adress-Objekt. `strict: true` verlangt, dass alle
  # Felder in `required` stehen und `additionalProperties: false` gesetzt ist.
  ADRESSE_SCHEMA = {
    type: "object",
    additionalProperties: false,
    properties: {
      name:    { type: %w[string null], description: "Firma/Person an dieser Adresse, falls abweichend" },
      strasse: { type: %w[string null], description: "Strasse und Hausnummer" },
      plz:     { type: %w[string null] },
      ort:     { type: %w[string null] },
      land:    { type: %w[string null], description: "Land, falls angegeben (z. B. CH, Schweiz)" }
    },
    required: %w[name strasse plz ort land]
  }.freeze

  SCHEMA = {
    type: "object",
    additionalProperties: false,
    properties: {
      kunde: {
        type: "object",
        additionalProperties: false,
        properties: {
          name:         { type: %w[string null], description: "Name/Firma des Warenempfaengers" },
          kundennummer: { type: %w[string null] },
          adresse:      ADRESSE_SCHEMA
        },
        required: %w[name kundennummer adresse]
      },
      lieferadresse:       ADRESSE_SCHEMA,
      lieferdatum:         { type: %w[string null], description: "Lieferdatum als YYYY-MM-DD" },
      lieferschein_nummer: { type: %w[string null] },
      bestellnummer:       { type: %w[string null], description: "Referenz auf Bestellung/Auftrag des Kunden" },
      positionen: {
        type: "array",
        description: "Artikelpositionen in der Reihenfolge des Lieferscheins",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            position:      { type: %w[integer null], description: "Positionsnummer laut Lieferschein" },
            artikelnummer: { type: %w[string null] },
            bezeichnung:   { type: "string" },
            menge:         { type: %w[number null] },
            einheit:       { type: %w[string null] }
          },
          required: %w[position artikelnummer bezeichnung menge einheit]
        }
      },
      warnungen: {
        type: "array",
        description: "Kurze Hinweise auf unsichere/unleserliche Stellen",
        items: { type: "string" }
      }
    },
    required: %w[kunde lieferadresse lieferdatum lieferschein_nummer bestellnummer positionen warnungen]
  }.freeze

  # @param io [IO] geoeffnete Datei (binaer)
  # @param content_type [String] z. B. "image/png", "application/pdf"
  # @param filename [String] Basisname ohne Endung, nur fuer die API-Meldung
  # @param api_key [String, nil] override; sonst Credentials/ENV
  # @param transport [#call] override fuer Tests; erhaelt den Payload-Hash,
  #   gibt den Response-Body als String zurueck
  def initialize(io:, content_type:, filename: "lieferschein", api_key: self.class.default_api_key, transport: nil)
    @io = io
    @content_type = content_type.to_s
    @filename = filename
    @api_key = api_key
    @transport = transport || method(:perform_request)
  end

  def self.call(**kwargs)
    new(**kwargs).call
  end

  # Bequemer Aufruf mit einem ActiveStorage-Anhang (z. B. DeliveryNote#file).
  def self.from_attachment(attachment, **kwargs)
    attachment.blob.open do |file|
      call(
        io:           file,
        content_type: attachment.content_type,
        filename:     attachment.filename.base,
        **kwargs
      )
    end
  end

  def self.default_api_key
    Rails.application.credentials.dig(:openai, :api_key) || ENV["OPENAI_API_KEY"]
  rescue StandardError
    ENV["OPENAI_API_KEY"]
  end

  def call
    if @api_key.to_s.strip.empty?
      raise ConfigurationError,
            "Kein OpenAI-API-Key. Setze OPENAI_API_KEY oder credentials openai.api_key."
    end

    body = @transport.call(build_payload)
    parse_response(body)
  end

  private

  def build_payload
    {
      model: MODEL,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      instructions: SYSTEM_PROMPT,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: USER_INSTRUCTION },
            file_content_part
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "lieferschein",
          strict: true,
          schema: SCHEMA
        }
      }
    }
  end

  def file_content_part
    @io.binmode if @io.respond_to?(:binmode)
    @io.rewind if @io.respond_to?(:rewind)
    data = Base64.strict_encode64(@io.read)

    if @content_type == "application/pdf"
      { type: "input_file", filename: "#{@filename}.pdf", file_data: "data:application/pdf;base64,#{data}" }
    elsif @content_type.start_with?("image/")
      { type: "input_image", image_url: "data:#{@content_type};base64,#{data}", detail: "high" }
    else
      raise UnsupportedTypeError, "Nicht unterstuetzter Dateityp: #{@content_type} (nur Bild oder PDF)"
    end
  end

  def perform_request(payload)
    http = Net::HTTP.new(ENDPOINT.host, ENDPOINT.port)
    http.use_ssl = true
    http.open_timeout = OPEN_TIMEOUT
    http.read_timeout = READ_TIMEOUT

    request = Net::HTTP::Post.new(ENDPOINT)
    request["Authorization"] = "Bearer #{@api_key}"
    request["Content-Type"] = "application/json"
    request.body = JSON.generate(payload)

    response = http.request(request)
    return response.body if response.is_a?(Net::HTTPSuccess)

    raise ApiError, "OpenAI-API HTTP #{response.code}: #{response.body}"
  end

  def parse_response(body)
    data = JSON.parse(body)
    raise ApiError, data.dig("error", "message") || "Unbekannter API-Fehler" if data["error"]

    parts = Array(data["output"]).flat_map { |item| Array(item["content"]) }

    refusal = parts.find { |part| part["type"] == "refusal" }
    raise ApiError, "Modell hat abgelehnt: #{refusal['refusal']}" if refusal

    text = parts.select { |part| part["type"] == "output_text" }
                .map { |part| part["text"] }
                .join

    if text.strip.empty?
      reason = data.dig("incomplete_details", "reason")
      raise ApiError, "Leere Antwort von der API#{reason ? " (#{reason})" : ''}"
    end

    JSON.parse(text)
  rescue JSON::ParserError => e
    raise ApiError, "Antwort ist kein gueltiges JSON: #{e.message}"
  end
end
