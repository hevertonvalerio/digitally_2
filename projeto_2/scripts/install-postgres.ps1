# Download PostgreSQL installer
$downloadUrl = "https://get.enterprisedb.com/postgresql/postgresql-17.4-1-windows-x64.exe"
$installerPath = "$env:TEMP\postgresql-installer.exe"

Write-Host "Baixando PostgreSQL..."
Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath

# Install PostgreSQL silently
Write-Host "Instalando PostgreSQL..."
$installArgs = @(
    '--mode', 'unattended',
    '--serverport', '5432',
    '--superpassword', 'postgres',
    '--servicename', 'postgresql-x64-17',
    '--serviceaccount', 'NT AUTHORITY\NetworkService',
    '--locale', 'pt_BR'
)

Start-Process -FilePath $installerPath -ArgumentList $installArgs -Wait

# Wait for service to be available
Write-Host "Aguardando serviço iniciar..."
Start-Sleep -Seconds 30

# Create database
Write-Host "Criando banco de dados..."
$env:PGPASSWORD = "postgres"
& "C:\Program Files\PostgreSQL\17\bin\createdb.exe" -U postgres projeto_digitaly

Write-Host "PostgreSQL instalado e configurado com sucesso!"
