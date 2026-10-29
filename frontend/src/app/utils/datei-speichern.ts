/**
 * Bietet Text als Datei zum Speichern an, ganz ohne Server: Der Browser
 * bekommt eine Object-URL und einen unsichtbaren Download-Link.
 */
export function dateiSpeichern(inhalt: string, dateiname: string, typ: string): void {
  const url = URL.createObjectURL(new Blob([inhalt], { type: typ }));
  const link = document.createElement('a');
  link.href = url;
  link.download = dateiname;
  link.click();
  // Erst nach dem Klick freigeben, sonst bricht der Download in manchen Browsern ab.
  setTimeout(() => URL.revokeObjectURL(url));
}
