$chrome='C:\Program Files\Google\Chrome\Application\chrome.exe'
$profile='C:\Users\Olga\Documents\inky-paws-animator\.liveview-cdp-profile'
$url='file:///C:/Users/Olga/Documents/inky-paws-animator/index.html'
$process=Start-Process -FilePath $chrome -ArgumentList @('--headless=new','--disable-gpu','--no-first-run',"--user-data-dir=$profile",'--remote-debugging-port=9333','--remote-allow-origins=*',$url) -WindowStyle Hidden -PassThru
try {
  $targets=$null
  for($i=0;$i-lt20-and-not$targets;$i++){Start-Sleep -Milliseconds 250;try{$targets=Invoke-RestMethod 'http://127.0.0.1:9333/json'}catch{}}
  $target=$targets|Where-Object{$_.type-eq'page'}|Select-Object -First 1
  $socket=[Net.WebSockets.ClientWebSocket]::new();$socket.ConnectAsync([Uri]$target.webSocketDebuggerUrl,[Threading.CancellationToken]::None).GetAwaiter().GetResult()
  function Send-Cdp($id,$method,$params=@{}){$payload=@{id=$id;method=$method;params=$params}|ConvertTo-Json -Compress -Depth 8;$bytes=[Text.Encoding]::UTF8.GetBytes($payload);$socket.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,[Threading.CancellationToken]::None).GetAwaiter().GetResult()}
  Send-Cdp 1 'Runtime.enable';Send-Cdp 2 'Log.enable';Send-Cdp 3 'Runtime.evaluate' @{expression='JSON.stringify({ready:document.readyState,scriptLoaded:typeof exportAnimation,encoder:typeof GifEncoder,createDisabled:document.querySelector("#create-animation").disabled,status:document.querySelector("#export-status").textContent})';returnByValue=$true}
  $deadline=[DateTime]::UtcNow.AddSeconds(5);$messages=@()
  while([DateTime]::UtcNow-lt$deadline){$buffer=New-Object byte[] 65536;$segment=[ArraySegment[byte]]::new($buffer);$cancel=[Threading.CancellationTokenSource]::new(500);try{$received=$socket.ReceiveAsync($segment,$cancel.Token).GetAwaiter().GetResult();$text=[Text.Encoding]::UTF8.GetString($buffer,0,$received.Count);$messages+=$text;if($text-match'"id":3'){break}}catch{}}
  $messages
  $socket.Dispose()
} finally {if($process-and-not$process.HasExited){Stop-Process -Id $process.Id -Force}}
