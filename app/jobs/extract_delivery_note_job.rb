class ExtractDeliveryNoteJob < ApplicationJob
  queue_as :default

  def perform(delivery_note_id)
    note = DeliveryNote.find_by(id: delivery_note_id)
    return if note.nil?

    note.update!(result: LieferscheinExtractor.from_attachment(note.file))
  rescue LieferscheinExtractor::Error => e
    # Ohne Eintrag würde das Frontend endlos weiterpollen.
    Rails.logger.error("KI-Erkennung fehlgeschlagen (Lieferschein #{delivery_note_id}): #{e.message}")
    note.update!(result: { "fehler" => e.message })
  end
end
