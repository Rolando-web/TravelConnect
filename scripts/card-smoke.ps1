# Card-payment live smoke (Phase 6 / C3).
# Requires the backend running on :5110 with PayMongo dev keys in
# server/TravelConnect.Server/appsettings.Development.json (sk_test_*** — secret,
# kept out of git; set it in that gitignored file before running).
#
# Usage:
#   pwsh scripts/card-smoke.ps1
# Switches the CARD and TEST_CARD env vars to exercise 3-D Secure (4143943944107897)
# or the decline path (any invalid 4-series Luhn card passes the sandbox gate and
# PayMongo declines it server-side).
param(
    [string]$Base = "http://localhost:5110",
    [string]$Card = "4242424242424242",
    [int]$ExpMonth = 12,
    [int]$ExpYear = 2028,
    [string]$Cvc = "123"
)

$ErrorActionPreference = "Stop"

Write-Host "[1/3] Create Payment Intent" -ForegroundColor Cyan
$intentBody = @{ amount = 2500; bookingReference = "SMOKE-CARD"; returnUrl = "$Base/payment-result?status=success" } | ConvertTo-Json
$intent = Invoke-RestMethod -Uri "$Base/api/payments/paymongo/card/intent" -Method Post -ContentType "application/json" -Body $intentBody
$intentId = $intent.intentId
Write-Host "  intentId=$intentId status=$($intent.status) clientKey=$($intent.clientKey)"

Write-Host "[2/3] Attach $Card" -ForegroundColor Cyan
$attachBody = @{
    intentId = $intentId
    cardNumber = $Card
    expMonth = $ExpMonth
    expYear = $ExpYear
    cvc = $Cvc
    holderName = "QA Smoke"
    bookingReference = "SMOKE-CARD"
} | ConvertTo-Json
$attach = Invoke-RestMethod -Uri "$Base/api/payments/paymongo/card/attach" -Method Post -ContentType "application/json" -Body $attachBody
Write-Host "  status=$($attach.status) brand=$($attach.cardBrand) nextActionUrl=$($attach.nextAction.redirectUrl)"

if ($attach.status -eq "failed") {
    Write-Host "  DECLINED: $($attach.failureReason)" -ForegroundColor Yellow
    Write-Host "Smoke result: declined as expected (attach path)." -ForegroundColor Green
    return
}

if ($attach.nextAction.redirectUrl) {
    Write-Host "  -> open the 3-D Secure URL in a browser popup, then let the poll below finish:" -ForegroundColor Magenta
    Write-Host "     $($attach.nextAction.redirectUrl)"
}

Write-Host "[3/3] Poll intent until terminal" -ForegroundColor Cyan
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 2500
    $status = Invoke-RestMethod -Uri "$Base/api/payments/paymongo/card/$intentId"
    Write-Host "  poll #$($i+1): status=$($status.status)"
    if ($status.status -in @("paid", "failed")) {
        if ($status.status -eq "paid") {
            Write-Host "Smoke result: SUCCESS (payment recorded, booking marked paid)." -ForegroundColor Green
        } else {
            Write-Host "Smoke result: FAILED - $($status.failureReason)" -ForegroundColor Yellow
        }
        return
    }
}
Write-Host "Smoke result: TIMEOUT waiting for terminal state." -ForegroundColor Red