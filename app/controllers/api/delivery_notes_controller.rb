module Api
  class DeliveryNotesController < ActionController::API
    rescue_from ActiveRecord::RecordNotFound do
      render json: { error: "Lieferschein nicht gefunden" }, status: :not_found
    end

    def create
      file = params[:file]
      note = DeliveryNote.new(file: file.is_a?(ActionDispatch::Http::UploadedFile) ? file : nil)
      if note.save
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
