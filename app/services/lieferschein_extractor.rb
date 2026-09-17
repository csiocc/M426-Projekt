# frozen_string_literal: true

require "net/http"
require "json"
require "base64"
require "openssl"

# Liest einen Lieferschein (Bild oder PDF) mit Hilfe der OpenAI-API aus und
# gibt die erkannten Daten als strukturierten Hash zurueck (siehe
# docs/ki/json-format.md). Prompt und JSON-Schema liegen in
# LieferscheinExtractor::Prompt und LieferscheinExtractor::Schema.
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
  class AttachmentError < Error; end

  # Vision-faehiges Modell mit Unterstuetzung fuer Structured Outputs.
  # Per ENV uebersteuerbar (z. B. "gpt-4o-mini" fuer guenstigere Tests).
  MODEL = ENV.fetch("OPENAI_MODEL", "gpt-4o-2024-08-06")
  ENDPOINT = URI("https://api.openai.com/v1/responses")

  # Sicherheitsnetz gegen zu grosse / teure Antworten. Alle per ENV
  # uebersteuerbar, da die passenden Werte vom Dokumentumfang abhaengen
  # (siehe Review: "token limit / timeouts evtl. zu knapp, muessen wir testen").
  MAX_OUTPUT_TOKENS = ENV.fetch("OPENAI_MAX_OUTPUT_TOKENS", "8000").to_i
  OPEN_TIMEOUT = ENV.fetch("OPENAI_OPEN_TIMEOUT", "15").to_i
  READ_TIMEOUT = ENV.fetch("OPENAI_READ_TIMEOUT", "180").to_i

  # Netzwerkfehler, die beim API-Aufruf auftreten koennen (Timeout, DNS, TLS,
  # abgebrochene Verbindung) und als ApiError statt als roher Stacktrace beim
  # Aufrufer ankommen sollen.
  NETWORK_ERRORS = [
    Timeout::Error, SocketError, OpenSSL::SSL::SSLError, SystemCallError, EOFError, IOError
  ].freeze

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
  # Deckt die beiden Faelle ab, die beim direkten `attachment.blob.open` roh
  # durchgeschlagen sind: kein Anhang vorhanden, oder die Datei fehlt im
  # Storage.
  def self.from_attachment(attachment, **kwargs)
    raise AttachmentError, "Kein Anhang vorhanden" if attachment.nil? || !attachment.attached?

    attachment.blob.open do |file|
      call(
        io:           file,
        content_type: attachment.content_type,
        filename:     attachment.filename.base,
        **kwargs
      )
    end
  rescue ActiveStorage::FileNotFoundError => e
    raise AttachmentError, "Datei im Storage nicht gefunden: #{e.message}"
  end

  # Nur das gezielte Fehlerbild "keine/kaputte master.key" wird geschluckt
  # (sonst ENV-Fallback nutzlos); alles andere soll durchschlagen.
  def self.default_api_key
    key =
      begin
        Rails.application.credentials.dig(:openai, :api_key)
      rescue ActiveSupport::EncryptedFile::MissingKeyError
        nil
      end

    key || ENV["OPENAI_API_KEY"]
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
      instructions: Prompt::SYSTEM,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: Prompt::USER_INSTRUCTION },
            file_content_part
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "lieferschein",
          strict: true,
          schema: Schema::ROOT
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
  rescue *NETWORK_ERRORS => e
    raise ApiError, "Netzwerkfehler beim Aufruf der OpenAI-API (#{e.class}): #{e.message}"
  end

  def parse_response(body)
    data = JSON.parse(body)
    raise ApiError, data.dig("error", "message") || "Unbekannter API-Fehler" if data["error"]

    # Muss VOR dem JSON.parse des Modell-Outputs geprueft werden: bei
    # "incomplete" ist der Text abgeschnitten (nicht leer), JSON.parse wuerde
    # scheitern und den eigentlichen Grund (z. B. Token-Limit) verschlucken.
    if data["status"] == "incomplete"
      grund = data.dig("incomplete_details", "reason") || "unbekannter Grund"
      raise ApiError, "Antwort unvollstaendig abgebrochen (#{grund}) - ggf. MAX_OUTPUT_TOKENS erhoehen"
    end

    parts = Array(data["output"]).flat_map { |item| Array(item["content"]) }

    refusal = parts.find { |part| part["type"] == "refusal" }
    raise ApiError, "Modell hat abgelehnt: #{refusal["refusal"]}" if refusal

    text = parts.select { |part| part["type"] == "output_text" }
                .map { |part| part["text"] }
                .join

    raise ApiError, "Leere Antwort von der API" if text.strip.empty?

    JSON.parse(text)
  rescue JSON::ParserError => e
    raise ApiError, "Antwort ist kein gueltiges JSON: #{e.message}"
  end
end
