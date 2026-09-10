require "test_helper"

class DeliveryNoteTest < ActiveSupport::TestCase
  def note_with(filename, content_type)
    DeliveryNote.new.tap do |note|
      note.file.attach(io: file_fixture(filename).open, filename: filename, content_type: content_type)
    end
  end

  test "gültig mit Bild" do
    assert note_with("lieferschein.png", "image/png").valid?
  end

  test "gültig mit PDF" do
    assert note_with("lieferschein.pdf", "application/pdf").valid?
  end

  test "ungültig ohne Datei" do
    assert_not DeliveryNote.new.valid?
  end

  test "ungültig mit Textdatei" do
    assert_not note_with("lieferschein.txt", "text/plain").valid?
  end

  test "ungültig über 20 MB" do
    note = note_with("lieferschein.png", "image/png")
    note.file.blob.byte_size = 21.megabytes
    assert_not note.valid?
  end
end
