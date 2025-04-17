# Verifica se o Chocolatey está instalado
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Instalando Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
}

# Instala o PostgreSQL
Write-Host "Instalando PostgreSQL..."
choco install postgresql -y

# Adiciona o caminho do PostgreSQL ao PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine")

# Inicia o serviço do PostgreSQL
Write-Host "Iniciando serviço do PostgreSQL..."
Start-Service postgresql

# Aguarda o serviço iniciar
Start-Sleep -s 10

# Cria o banco de dados e o usuário
Write-Host "Configurando banco de dados..."
$env:PGPASSWORD = "postgres"
psql -U postgres -c "CREATE DATABASE projeto_digitaly;"

Write-Host "PostgreSQL instalado e configurado com sucesso!"
