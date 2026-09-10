require "test_helper"

module Api
  class DeliveryNotesControllerTest < ActionDispatch::IntegrationTest
    test "legt Lieferschein aus Bild an und liefert die id" do
      assert_difference("DeliveryNote.count", 1) do
        post api_delivery_notes_url, params: { file: fixture_file_upload("lieferschein.png", "image/png") }
      end
      assert_response :created
      assert_equal DeliveryNote.last.id, response.parsed_body["id"]
    end

    test "ohne Datei 422 mit Fehlermeldung" do
      assert_no_difference("DeliveryNote.count") do
        post api_delivery_notes_url
      end
      assert_response :unprocessable_content
      assert_includes response.parsed_body["errors"], "Datei fehlt"
    end

    test "mit String statt Datei 422" do
      assert_no_difference("DeliveryNote.count") do
        post api_delivery_notes_url, params: { file: "kein-upload" }
      end
      assert_response :unprocessable_content
    end

    test "mit Textdatei 422" do
      assert_no_difference("DeliveryNote.count") do
        post api_delivery_notes_url, params: { file: fixture_file_upload("lieferschein.txt", "text/plain") }
      end
      assert_response :unprocessable_content
    end

    test "show liefert id und KI-Resultat" do
      note = create_note(result: { "lieferant" => "Muster AG" })
      get api_delivery_note_url(note)
      assert_response :success
      assert_equal({ "id" => note.id, "result" => { "lieferant" => "Muster AG" } }, response.parsed_body)
    end

    test "show liefert null solange kein Resultat da ist" do
      get api_delivery_note_url(create_note)
      assert_response :success
      assert_nil response.parsed_body["result"]
    end

    test "show mit unbekannter id 404" do
      get api_delivery_note_url(0)
      assert_response :not_found
      assert_equal "Lieferschein nicht gefunden", response.parsed_body["error"]
    end

    private

    def create_note(result: nil)
      DeliveryNote.create!(result: result, file: fixture_file_upload("lieferschein.png", "image/png"))
    end
  end
end
