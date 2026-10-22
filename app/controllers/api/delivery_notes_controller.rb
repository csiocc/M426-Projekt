module Api
  class DeliveryNotesController < ActionController::API
    rescue_from ActiveRecord::RecordNotFound do
      render json: { error: "Lieferschein nicht gefunden" }, status: :not_found
    end
    # restrict uploads to 10 within 15min
    rate_limit to: 10, within: 15.minute, only: :create, with: -> {
      render json: { error: "Zu viele Uploads. Bitte 15 Minuten warten." }, status: :too_many_requests
    }

    def create
      file = params[:file]
      note = DeliveryNote.new(file: file.is_a?(ActionDispatch::Http::UploadedFile) ? file : nil)
      if note.save
        ExtractDeliveryNoteJob.perform_later(note.id)
        render json: { id: note.id }, status: :created
      else
        render json: { errors: note.errors.full_messages }, status: :unprocessable_content
      end
    end

    def show
      render json: DeliveryNote.find(params[:id]).slice(:id, :result)
    end
  end
end
