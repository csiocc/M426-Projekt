class ExtractDeliveryNoteJob < ApplicationJob
  queue_as :default

  def perform(delivery_note_id)
    note = DeliveryNote.find_by(id: delivery_note_id)
    return if note.nil?

    note.update!(result: LieferscheinExtractor.from_attachment(note.file))
  rescue LieferscheinExtractor::Error => e
    # Ohne Eintrag würde das Frontend endlos weiterpollen.
    note.update!(result: { "fehler" => e.message })
  rescue StandardError
    # also catch unexpected errors, so the frontend allways gets an answer
    note.update!(result: { "fehler" => "Unerwarteter Fehler bei der Erkennung" })
    raise
  end
end
