module Api
  class DeliveryNotesController < ActionController::API
    def create
      file = params[:file]
      note = DeliveryNote.new(file: file.is_a?(ActionDispatch::Http::UploadedFile) ? file : nil)
      if note.save
        render json: { id: note.id }, status: :created
      else
        render json: { errors: note.errors.full_messages }, status: :unprocessable_content
      end
    end
  end
end
