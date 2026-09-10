class DeliveryNote < ApplicationRecord
  has_one_attached :file

  validates :file,
            attached: { message: "fehlt" },
            # OpenAI nimmt nur PNG, JPEG, WebP und GIF.
            content_type: { in: [ "image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf" ],
                            message: "muss PNG, JPG, WebP, GIF oder PDF sein" },
            size: { less_than_or_equal_to: 20.megabytes, message: "darf höchstens 20 MB gross sein" }
end
