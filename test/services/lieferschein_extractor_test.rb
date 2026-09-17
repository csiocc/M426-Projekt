require "test_helper"

class LieferscheinExtractorTest < ActiveSupport::TestCase
  # Minimaler, gueltiger Response-Body der OpenAI Responses-API.
  def api_body(json)
    {
      "status" => "completed",
      "output" => [
        {
          "type" => "message",
          "role" => "assistant",
          "content" => [ { "type" => "output_text", "text" => json.to_json } ]
        }
      ]
    }.to_json
  end

  def erkannte_daten
    {
      "kunde" => {
        "name" => "Muster AG",
        "kundennummer" => "K-1024",
        "adresse" => { "name" => nil, "strasse" => "Bahnhofstrasse 1", "plz" => "8001", "ort" => "Zuerich", "land" => "CH" }
      },
      "lieferadresse" => { "name" => "Baustelle Nord", "strasse" => "Industrieweg 5", "plz" => "8600", "ort" => "Duebendorf", "land" => "CH" },
      "lieferdatum" => "2026-09-10",
      "lieferschein_nummer" => "LS-2026-0042",
      "bestellnummer" => "B-9987",
      "positionen" => [
        { "position" => 1, "artikelnummer" => "A-100", "bezeichnung" => "Schrauben 4x30", "menge" => 250.0, "einheit" => "Stk" }
      ],
      "warnungen" => []
    }
  end

  test "parst die JSON-Antwort in einen Hash" do
    transport = ->(_payload) { api_body(erkannte_daten) }

    result = LieferscheinExtractor.call(
      io: StringIO.new("bild"), content_type: "image/png",
      api_key: "test", transport: transport
    )

    assert_equal "Muster AG", result.dig("kunde", "name")
    assert_equal "2026-09-10", result["lieferdatum"]
    assert_equal 250.0, result.dig("positionen", 0, "menge")
  end

  test "baut fuer Bilder einen input_image-Part" do
    captured = nil
    transport = lambda do |payload|
      captured = payload
      api_body(erkannte_daten)
    end

    LieferscheinExtractor.call(
      io: StringIO.new("bild"), content_type: "image/png",
      api_key: "test", transport: transport
    )

    part = captured.dig(:input, 0, :content, 1)
    assert_equal "input_image", part[:type]
    assert part[:image_url].start_with?("data:image/png;base64,")
  end

  test "baut fuer PDF einen input_file-Part" do
    captured = nil
    transport = lambda do |payload|
      captured = payload
      api_body(erkannte_daten)
    end

    LieferscheinExtractor.call(
      io: StringIO.new("%PDF-1.4"), content_type: "application/pdf",
      api_key: "test", transport: transport
    )

    part = captured.dig(:input, 0, :content, 1)
    assert_equal "input_file", part[:type]
    assert part[:file_data].start_with?("data:application/pdf;base64,")
  end

  test "schickt das strikte JSON-Schema mit" do
    captured = nil
    transport = lambda do |payload|
      captured = payload
      api_body(erkannte_daten)
    end

    LieferscheinExtractor.call(
      io: StringIO.new("bild"), content_type: "image/png",
      api_key: "test", transport: transport
    )

    format = captured.dig(:text, :format)
    assert_equal "json_schema", format[:type]
    assert format[:strict]
    assert_equal LieferscheinExtractor::Schema::ROOT, format[:schema]
  end

  test "meldet ConfigurationError ohne API-Key" do
    error = assert_raises(LieferscheinExtractor::ConfigurationError) do
      LieferscheinExtractor.call(
        io: StringIO.new("bild"), content_type: "image/png",
        api_key: "  ", transport: ->(_p) { api_body(erkannte_daten) }
      )
    end
    assert_match(/API-Key/, error.message)
  end

  test "meldet UnsupportedTypeError bei falschem Dateityp" do
    assert_raises(LieferscheinExtractor::UnsupportedTypeError) do
      LieferscheinExtractor.call(
        io: StringIO.new("txt"), content_type: "text/plain",
        api_key: "test", transport: ->(_p) { api_body(erkannte_daten) }
      )
    end
  end

  test "meldet ApiError bei Fehler-Antwort" do
    transport = ->(_payload) { { "error" => { "message" => "invalid_api_key" } }.to_json }

    error = assert_raises(LieferscheinExtractor::ApiError) do
      LieferscheinExtractor.call(
        io: StringIO.new("bild"), content_type: "image/png",
        api_key: "test", transport: transport
      )
    end
    assert_match(/invalid_api_key/, error.message)
  end

  test "meldet ApiError bei Ablehnung durch das Modell" do
    body = {
      "status" => "completed",
      "output" => [
        { "type" => "message", "role" => "assistant",
          "content" => [ { "type" => "refusal", "refusal" => "Kann das nicht verarbeiten." } ] }
      ]
    }.to_json
    transport = ->(_payload) { body }

    error = assert_raises(LieferscheinExtractor::ApiError) do
      LieferscheinExtractor.call(
        io: StringIO.new("bild"), content_type: "image/png",
        api_key: "test", transport: transport
      )
    end
    assert_match(/abgelehnt/, error.message)
  end

  test "meldet ApiError bei abgebrochener Antwort statt kaputtem JSON" do
    # status: "incomplete" -> Text ist abgeschnitten, nicht leer. Vor dem Fix
    # landete das in JSON.parse und der eigentliche Grund (Token-Limit) ging
    # in einer "kein gueltiges JSON"-Meldung verloren.
    body = {
      "status" => "incomplete",
      "incomplete_details" => { "reason" => "max_output_tokens" },
      "output" => [
        { "type" => "message", "role" => "assistant",
          "content" => [ { "type" => "output_text", "text" => '{"kunde": {"name": "Abgeschni' } ] }
      ]
    }.to_json
    transport = ->(_payload) { body }

    error = assert_raises(LieferscheinExtractor::ApiError) do
      LieferscheinExtractor.call(
        io: StringIO.new("bild"), content_type: "image/png",
        api_key: "test", transport: transport
      )
    end
    assert_match(/max_output_tokens/, error.message)
  end

  test "meldet ApiError statt rohem Stacktrace bei Netzwerkfehler" do
    extractor = LieferscheinExtractor.new(
      io: StringIO.new("bild"), content_type: "image/png", api_key: "test"
    )
    # Nur die eine Instanz ueberschreiben (kein globales Stubbing noetig) -
    # simuliert einen Netzwerkfehler beim eigentlichen Request.
    extractor.define_singleton_method(:execute_http_request) do |*_args|
      raise Net::OpenTimeout, "timeout"
    end

    error = assert_raises(LieferscheinExtractor::ApiError) { extractor.call }
    assert_match(/Netzwerkfehler/, error.message)
  end

  test "from_attachment meldet AttachmentError ohne Anhang" do
    assert_raises(LieferscheinExtractor::AttachmentError) do
      LieferscheinExtractor.from_attachment(nil)
    end
  end

  test "from_attachment meldet AttachmentError wenn nichts angehaengt ist" do
    leerer_anhang = Class.new { def attached? = false }.new

    assert_raises(LieferscheinExtractor::AttachmentError) do
      LieferscheinExtractor.from_attachment(leerer_anhang)
    end
  end
end
