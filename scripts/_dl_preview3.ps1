$dir = 'C:\Users\LENOVO\Desktop\platform\PataProducts\play\scripts\output\preview'
$base = 'https://sdevofgaeiwkfinlmnab.supabase.co/storage/v1/object/public/play-assets/signs/'
$files = @(
  'Parking%20on%20verge2.webp','ParkingZone.webp','STOP%20POLICE.webp',
  'image1.webp','image4.webp','no%20parking.webp','one%20way.webp',
  'parkraw.webp','right.webp','stop%20poloce2.webp','tjunction.webp',
  'turn%20left.webp','no%20pedestrians.webp','end%20of%20no%20overtaking.webp',
  'no%20overtaking.webp','no%20stopping.webp'
)
foreach ($f in $files) {
  $out = Join-Path $dir ([uri]::UnescapeDataString($f))
  try { Invoke-WebRequest -Uri ($base + $f) -OutFile $out -ErrorAction Stop }
  catch { Write-Host "FAILED: $f" }
}
Get-ChildItem $dir | Measure-Object | Select-Object Count
