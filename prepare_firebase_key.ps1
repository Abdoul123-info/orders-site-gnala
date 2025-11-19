# Script PowerShell pour préparer la clé Firebase pour Render
# Usage: .\prepare_firebase_key.ps1 "chemin\vers\votre\fichier.json"

param(
    [Parameter(Mandatory=$true)]
    [string]$JsonFilePath
)

Write-Host "🔧 Préparation de la clé Firebase pour Render..." -ForegroundColor Cyan
Write-Host ""

# Vérifier que le fichier existe
if (-not (Test-Path $JsonFilePath)) {
    Write-Host "❌ Erreur: Le fichier n'existe pas: $JsonFilePath" -ForegroundColor Red
    exit 1
}

try {
    # Lire le fichier JSON
    Write-Host "📖 Lecture du fichier JSON..." -ForegroundColor Yellow
    $jsonContent = Get-Content $JsonFilePath -Raw
    
    # Vérifier que c'est un JSON valide
    $jsonObject = $jsonContent | ConvertFrom-Json
    Write-Host "✅ JSON valide détecté" -ForegroundColor Green
    Write-Host ""
    
    # Convertir en une seule ligne (minifier)
    Write-Host "🔄 Conversion en une seule ligne..." -ForegroundColor Yellow
    $minifiedJson = ($jsonObject | ConvertTo-Json -Compress -Depth 10)
    
    # Afficher le résultat
    Write-Host ""
    Write-Host ("=" * 80) -ForegroundColor Cyan
    Write-Host "📋 COPIEZ LE TEXTE CI-DESSOUS DANS RENDER:" -ForegroundColor Green
    Write-Host ("=" * 80) -ForegroundColor Cyan
    Write-Host ""
    Write-Host $minifiedJson -ForegroundColor White
    Write-Host ""
    Write-Host ("=" * 80) -ForegroundColor Cyan
    Write-Host ""
    
    # Sauvegarder dans un fichier
    $outputFile = "firebase_key_for_render.txt"
    $minifiedJson | Out-File -FilePath $outputFile -Encoding UTF8 -NoNewline
    Write-Host "💾 Le JSON a été sauvegardé dans: $outputFile" -ForegroundColor Green
    Write-Host ""
    
    # Instructions
    Write-Host "📝 INSTRUCTIONS POUR RENDER:" -ForegroundColor Yellow
    Write-Host "1. Allez sur https://dashboard.render.com" -ForegroundColor White
    Write-Host "2. Sélectionnez votre service 'orders-site-gnala'" -ForegroundColor White
    Write-Host "3. Allez dans 'Environment' → 'Environment Variables'" -ForegroundColor White
    Write-Host "4. Cliquez sur 'Add Environment Variable'" -ForegroundColor White
    Write-Host "5. Key: FIREBASE_SERVICE_ACCOUNT_KEY" -ForegroundColor White
    Write-Host "6. Value: Collez le texte ci-dessus (ou depuis $outputFile)" -ForegroundColor White
    Write-Host "7. Cliquez sur 'Save Changes'" -ForegroundColor White
    Write-Host "8. Le service redéploiera automatiquement" -ForegroundColor White
    Write-Host ""
    
    Write-Host "✅ Terminé! Vérifiez les logs Render après le redéploiement." -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "❌ Erreur lors du traitement du fichier JSON:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Vérifiez que:" -ForegroundColor Yellow
    Write-Host "   - Le fichier est un JSON valide" -ForegroundColor White
    Write-Host "   - Le chemin du fichier est correct" -ForegroundColor White
    exit 1
}

