try {
    $res = Invoke-WebRequest -Uri "http://localhost:8086/api/v1/wes/pallets" -UseBasicParsing
    Write-Host "Success: " $res.Content
} catch {
    Write-Host "Caught error: " $_.Exception.Message
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Response body: " $reader.ReadToEnd()
    }
}
