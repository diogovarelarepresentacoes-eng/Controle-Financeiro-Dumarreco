param(
  [string]$BaseUrl = "http://localhost:3333"
)

function Read-ResponseBody([System.Net.WebResponse]$resp) {
  try {
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
    return $sr.ReadToEnd()
  } catch {
    return ""
  }
}

function Compact-Text([string]$text, [int]$maxLen = 220) {
  if ($null -eq $text) { return "" }
  $t = $text -replace "(\r\n|\n|\r)+", " "
  if ($t.Length -le $maxLen) { return $t }
  return ($t.Substring(0, $maxLen) + "...")
}

$checks = @(
  @{ name = "health";        method = "GET";  url = "$BaseUrl/health";                          expect = "200" },
  @{ name = "products:list"; method = "GET";  url = "$BaseUrl/api/products";                    expect = "200" },
  @{ name = "products:search"; method = "GET"; url = "$BaseUrl/api/products/search?q=test";     expect = "200" },
  @{ name = "stock:batch";   method = "GET";  url = "$BaseUrl/api/products/stock/batch?codes=A"; expect = "200" },
  @{ name = "purchases:list"; method = "GET"; url = "$BaseUrl/api/purchases";                   expect = "200" },
  @{ name = "products:import:preview"; method = "POST"; url = "$BaseUrl/api/products/import/preview"; expect = "400" },
  @{ name = "products:import"; method = "POST"; url = "$BaseUrl/api/products/import";           expect = "400" },
  @{ name = "stock:import";   method = "POST"; url = "$BaseUrl/api/stock/import";               expect = "400" }
)

Write-Host ("Smoke test financeiro - " + (Get-Date).ToString("s"))
Write-Host ("BaseUrl: " + $BaseUrl)
Write-Host ""

$failed = 0

foreach ($c in $checks) {
  $m = $c.method
  $u = $c.url
  $name = $c.name
  $expect = $c.expect

  try {
    $r = Invoke-WebRequest -UseBasicParsing -Method $m -Uri $u -TimeoutSec 25
    $status = [int]$r.StatusCode
    $body = Compact-Text $r.Content
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $status = [int]$resp.StatusCode
      $body = Compact-Text (Read-ResponseBody $resp)
    } else {
      $status = -1
      $body = Compact-Text $_.Exception.Message
    }
  }

  $ok = ($status.ToString() -eq $expect)
  if (-not $ok) { $failed++ }

  $result = if ($ok) { "OK" } else { "FAIL" }
  Write-Host ("[{0}] {1} ({2} {3}) expected={4} got={5} body={6}" -f $result, $name, $m, $u, $expect, $status, $body)
}

Write-Host ""
if ($failed -gt 0) {
  Write-Host ("FAILED: {0} check(s) did not match expected status." -f $failed)
  exit 1
}

Write-Host "PASSED: all checks matched expected status."
exit 0

