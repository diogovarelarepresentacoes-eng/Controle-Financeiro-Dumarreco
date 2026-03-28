# ─── Configurações FTP (lê de variáveis de ambiente) ─────────────────────────
$ftpHost   = $env:FTP_HOST
$ftpUser   = $env:FTP_USER
$ftpPass   = $env:FTP_PASS

if (-not $ftpHost -or -not $ftpUser -or -not $ftpPass) {
    Write-Host 'ERRO: Defina as variáveis de ambiente FTP_HOST, FTP_USER e FTP_PASS antes de executar.' -ForegroundColor Red
    exit 1
}
$remotePath = '/public_html'
$localDist  = Join-Path $PSScriptRoot 'dist'

# ─── Helpers FTP ─────────────────────────────────────────────────────────────
function FTP-MkDir([string]$remoteDir) {
    try {
        $req = [System.Net.FtpWebRequest]::Create("ftp://$ftpHost$remoteDir")
        $req.Method      = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $req.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $req.UsePassive  = $true
        $req.KeepAlive   = $false
        $req.GetResponse().Close()
    } catch {
        # Ignora se o diretório já existe (erro 550)
    }
}

function FTP-Upload([string]$localFile, [string]$remoteFile) {
    $req = [System.Net.FtpWebRequest]::Create("ftp://$ftpHost$remoteFile")
    $req.Method      = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $req.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
    $req.UseBinary   = $true
    $req.UsePassive  = $true
    $req.KeepAlive   = $false

    $bytes = [System.IO.File]::ReadAllBytes($localFile)
    $req.ContentLength = $bytes.Length

    $stream = $req.GetRequestStream()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()
    $req.GetResponse().Close()
}

# ─── Cria subpastas remotas ───────────────────────────────────────────────────
$dirs = Get-ChildItem -Path $localDist -Recurse -Directory
foreach ($d in $dirs) {
    $rel = $d.FullName.Substring($localDist.Length).Replace('\', '/')
    FTP-MkDir "$remotePath$rel"
}

# ─── Envia todos os arquivos ──────────────────────────────────────────────────
$files  = Get-ChildItem -Path $localDist -Recurse -File
$total  = $files.Count
$i      = 0
$erros  = @()

foreach ($f in $files) {
    $rel    = $f.FullName.Substring($localDist.Length).Replace('\', '/')
    $remote = "$remotePath$rel"
    $i++

    Write-Host "  [$i/$total] $rel" -NoNewline

    try {
        FTP-Upload $f.FullName $remote
        Write-Host ' OK' -ForegroundColor Green
    } catch {
        Write-Host " ERRO: $_" -ForegroundColor Red
        $erros += $rel
    }
}

Write-Host ''

if ($erros.Count -eq 0) {
    Write-Host "  Todos os $total arquivo(s) enviados com sucesso!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "  $($erros.Count) arquivo(s) com erro:" -ForegroundColor Yellow
    $erros | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    exit 1
}
