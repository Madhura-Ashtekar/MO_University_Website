/**
 * Shared classification logic — mirrors backend logic.py classify() exactly.
 * This is the single source of truth for frontend preview classification.
 */
export function classifyMealRow(mealType, locationType, notes) {
  const text = `${mealType || ''} ${locationType || ''} ${notes || ''}`.toLowerCase()

  if (text.includes('per diem') || text.includes('per-diem') || locationType === 'perdiem' || locationType === 'airport') {
    return { moFulfills: false, fulfillmentType: 'not_mo' }
  }
  if (text.includes('provided') || text.includes('at field')) {
    return { moFulfills: false, fulfillmentType: 'not_mo' }
  }
  if (text.includes('pickup') || text.includes('pick-up') || text.includes('pick up')) {
    return { moFulfills: true, fulfillmentType: 'mo_pickup' }
  }
  if (text.includes('tbd')) {
    return { moFulfills: false, fulfillmentType: 'tbd' }
  }
  return { moFulfills: true, fulfillmentType: 'mo_delivery' }
}

export function classificationPill(fulfillmentType) {
  switch (fulfillmentType) {
    case 'not_mo':
      return { bg: '#F1F5F9', tx: '#475569', label: 'Not MO' }
    case 'tbd':
      return { bg: '#FEF3C7', tx: '#92400E', label: 'TBD' }
    case 'mo_pickup':
      return { bg: '#DEFBE6', tx: '#14532D', label: 'MO Pickup' }
    case 'mo_delivery':
    default:
      return { bg: '#DEFBE6', tx: '#14532D', label: 'MO Delivery' }
  }
}
