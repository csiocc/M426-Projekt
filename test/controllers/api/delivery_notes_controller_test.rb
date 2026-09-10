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
  end
end
