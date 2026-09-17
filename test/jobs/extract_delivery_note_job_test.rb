require "test_helper"

class ExtractDeliveryNoteJobTest < ActiveJob::TestCase
  include ActiveSupport::Testing::FileFixtures
  include ActionDispatch::TestProcess::FixtureFile
  def note
    @note ||= DeliveryNote.create!(file: fixture_file_upload("lieferschein.png", "image/png"))
  end

  # Minitest 6 liefert kein minitest/mock mehr, und der Job soll keinen Seam
  # nur für Tests bekommen. Sechs Zeilen Ruby statt eines neuen Gems.
  def stub_extractor(fake)
    original = LieferscheinExtractor.method(:from_attachment)
    LieferscheinExtractor.define_singleton_method(:from_attachment) { |attachment| fake.call(attachment) }
    yield
  ensure
    LieferscheinExtractor.define_singleton_method(:from_attachment, original)
  end

  test "speichert das erkannte JSON am Lieferschein" do
    daten = { "lieferschein_nummer" => "LS-2026-0042", "positionen" => [] }

    stub_extractor(->(_attachment) { daten }) do
      ExtractDeliveryNoteJob.perform_now(note.id)
    end

    assert_equal daten, note.reload.result
  end

  test "übergibt den Anhang an den Service" do
    uebergeben = nil

    stub_extractor(->(attachment) { uebergeben = attachment; {} }) do
      ExtractDeliveryNoteJob.perform_now(note.id)
    end

    assert_equal note.file.attachment, uebergeben.attachment
  end

  test "speichert eine Fehlermeldung statt zu scheitern" do
    fehler = ->(_attachment) { raise LieferscheinExtractor::ApiError, "OpenAI-API HTTP 401" }

    stub_extractor(fehler) do
      ExtractDeliveryNoteJob.perform_now(note.id)
    end

    assert_equal "OpenAI-API HTTP 401", note.reload.result["fehler"]
  end

  test "gelöschter Lieferschein lässt den Job nicht scheitern" do
    id = note.id
    note.destroy!

    assert_nothing_raised { ExtractDeliveryNoteJob.perform_now(id) }
  end
end
