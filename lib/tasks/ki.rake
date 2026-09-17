namespace :ki do
  desc "Testet die Lieferschein-Erkennung mit einer lokalen Datei. " \
       "Aufruf: bin/rails 'ki:extract[pfad/zum/lieferschein.pdf]'"
  task :extract, [ :pfad ] => :environment do |_task, args|
    pfad = args[:pfad]
    abort "Pfad angeben: bin/rails 'ki:extract[lieferschein.pdf]'" if pfad.blank?
    abort "Datei nicht gefunden: #{pfad}" unless File.file?(pfad)

    content_type = Marcel::MimeType.for(Pathname.new(pfad))
    puts "Datei:  #{pfad} (#{content_type})"
    puts "Modell: #{LieferscheinExtractor::MODEL}"
    puts "-> sende an OpenAI ..."

    result = File.open(pfad, "rb") do |file|
      LieferscheinExtractor.call(
        io:           file,
        content_type: content_type,
        filename:     File.basename(pfad, ".*")
      )
    end

    puts JSON.pretty_generate(result)
  rescue LieferscheinExtractor::Error => e
    abort "Fehler: #{e.message}"
  end
end
