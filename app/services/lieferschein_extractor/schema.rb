# frozen_string_literal: true

# JSON-Schema fuer LieferscheinExtractor, ausgelagert aus dem Service
# (siehe Review-Kommentar: Prompt/Schema blaehen den Service auf).
#
# Feld-fuer-Feld-Dokumentation: docs/ki/json-format.md
class LieferscheinExtractor
  module Schema
    # Wiederverwendbares Adress-Objekt. `strict: true` (siehe ROOT) verlangt,
    # dass alle Felder in `required` stehen und `additionalProperties: false`
    # gesetzt ist.
    ADRESSE = {
      type: "object",
      additionalProperties: false,
      properties: {
        name:    { type: %w[string null], description: "Firma/Person an dieser Adresse, falls abweichend" },
        strasse: { type: %w[string null], description: "Strasse und Hausnummer" },
        plz:     { type: %w[string null] },
        ort:     { type: %w[string null] },
        land:    { type: %w[string null], description: "Land, falls angegeben (z. B. CH, Schweiz)" }
      },
      required: %w[name strasse plz ort land]
    }.freeze

    ROOT = {
      type: "object",
      additionalProperties: false,
      properties: {
        kunde: {
          type: "object",
          additionalProperties: false,
          properties: {
            name:         { type: %w[string null], description: "Name/Firma des Warenempfaengers" },
            kundennummer: { type: %w[string null] },
            adresse:      ADRESSE
          },
          required: %w[name kundennummer adresse]
        },
        lieferadresse:       ADRESSE,
        lieferdatum:         { type: %w[string null], description: "Lieferdatum als YYYY-MM-DD" },
        lieferschein_nummer: { type: %w[string null] },
        bestellnummer:       { type: %w[string null], description: "Referenz auf Bestellung/Auftrag des Kunden" },
        positionen: {
          type: "array",
          description: "Artikelpositionen in der Reihenfolge des Lieferscheins",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              position:      { type: %w[integer null], description: "Positionsnummer laut Lieferschein" },
              artikelnummer: { type: %w[string null] },
              bezeichnung:   { type: "string" },
              menge:         { type: %w[number null] },
              einheit:       { type: %w[string null] }
            },
            required: %w[position artikelnummer bezeichnung menge einheit]
          }
        },
        warnungen: {
          type: "array",
          description: "Kurze Hinweise auf unsichere/unleserliche Stellen",
          items: { type: "string" }
        }
      },
      required: %w[kunde lieferadresse lieferdatum lieferschein_nummer bestellnummer positionen warnungen]
    }.freeze
  end
end
