// Pure refund maths for the admin "what would this return?" preview.
//
// The authoritative number is always computed server-side by
// CancellationPolicyService and frozen onto the cancellation record; this only
// mirrors that arithmetic so the admin sees the effect of a rule immediately.
// Keep it in step with CancellationPolicyService.Defaults.Rules():
//   refundable = total x refund%
//   airline fee = refundable x airlineFeePercent% + airlineFeeAmount
//   refund      = refundable - airline fee - agency - payment - other, floored at 0
export function previewRefund(rule, total) {
  const base = (Number(total) || 0) * (Number(rule?.refundPercentage) || 0) / 100;
  const airlineFee =
    base * (Number(rule?.airlineFeePercent) || 0) / 100 + (Number(rule?.airlineFeeAmount) || 0);
  const fees =
    airlineFee +
    (Number(rule?.agencyServiceFee) || 0) +
    (Number(rule?.paymentProcessingFee) || 0) +
    (Number(rule?.otherFee) || 0);
  return Math.max(0, base - fees);
}
