class CreateDeliveryNotes < ActiveRecord::Migration[8.1]
  def change
    create_table :delivery_notes do |t|
      t.json :result

      t.timestamps
    end
  end
end
