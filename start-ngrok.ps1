# Script PowerShell pour démarrer le serveur avec ngrok

Write-Host "Démarrage du serveur orders_site..." -ForegroundColor Green

# Vérifier si ngrok est installé
$ngrokPath = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokPath) {
    Write-Host "ERREUR: ngrok n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    Write-Host "Téléchargez ngrok depuis: https://ngrok.com/download" -ForegroundColor Yellow
    exit 1
}

# Démarrer le serveur en arrière-plan
$serverProcess = Start-Process node -ArgumentList "server.js" -PassThru -NoNewWindow

Start-Sleep -Seconds 3

# Vérifier si le serveur est démarré
if (-not $serverProcess.HasExited) {
    Write-Host "Serveur démarré sur le port 3000" -ForegroundColor Green
    Write-Host "Démarrage de ngrok..." -ForegroundColor Green
    
    # Démarrer ngrok
    Start-Process ngrok -ArgumentList "http", "3000"
    
    Write-Host "" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "ngrok est en cours d'exécution!" -ForegroundColor Cyan
    Write-Host "Ouvrez http://localhost:4040 pour voir l'URL publique" -ForegroundColor Cyan
    Write-Host "Copiez l'URL HTTPS et mettez-la à jour dans l'app Flutter" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "" -ForegroundColor Green
    Write-Host "Appuyez sur Ctrl+C pour arrêter le serveur" -ForegroundColor Yellow
    
    # Attendre que le serveur soit arrêté
    try {
        $serverProcess.WaitForExit()
    } catch {
        Write-Host "Arrêt du serveur..." -ForegroundColor Yellow
        Stop-Process -Id $serverProcess.Id -Force
    }
} else {
    Write-Host "ERREUR: Le serveur n'a pas pu démarrer" -ForegroundColor Red
}


