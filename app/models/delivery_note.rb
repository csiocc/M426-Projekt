class DeliveryNote < ApplicationRecord
  has_one_attached :file

  validates :file,
            attached: { message: "fehlt" },
            content_type: { in: [ %r{\Aimage/.*\z}, "application/pdf" ], message: "muss ein Bild oder PDF sein" },
            size: { less_than_or_equal_to: 20.megabytes, message: "darf höchstens 20 MB gross sein" }
end
