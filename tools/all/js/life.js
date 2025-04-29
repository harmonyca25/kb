/**
 * Life Insurance Calculator Module
 * FSRA-compliant educational estimator • PIPEDA-safe (all processing client-side)
 */
function initLifeInsurance() {
  // Global stores for UI breakdown
  window.lifeCalculationDetails = [];
  window.lifeAssumptions = [];

  // Risk factors & base rates
  const DATA = {
    // Rate per $1 000 of coverage
    baseRates: { nonSmoker: 0.50, smoker: 0.80 },

    // Age risk multipliers
    ageFactors: {
      18: 1.00, 25: 1.10, 30: 1.20, 35: 1.35, 40: 1.50,
      45: 1.75, 50: 2.10, 55: 2.60, 60: 3.20, 65: 4.00, 70: 5.00
    },

    // Term length adjustments
    termFactors: { 10:1.00, 15:1.05, 20:1.10, 25:1.15, 30:1.20 },

    // Health-rating adjustments
    healthRatingFactors: {
      preferred:   0.90,
      standard:    1.00,
      substandard: 1.25
    }
  };

  // Wire up buttons
  const calcBtn    = document.getElementById('calculateLifeBtn');
  const toggleBtn  = document.getElementById('toggleLifeDetails');
  if (calcBtn)   calcBtn.addEventListener('click', calculateLifePremium);
  if (toggleBtn) toggleBtn.addEventListener('click', () => {
    const sec = document.getElementById('lifeDetailsSection');
    sec.classList.toggle('hidden');
    toggleBtn.textContent = sec.classList.contains('hidden')
      ? 'Show calculation details'
      : 'Hide calculation details';
  });

  // Run initial estimate
  calculateLifePremium();

  function calculateLifePremium() {
    // Reset
    window.lifeCalculationDetails = [];
    window.lifeAssumptions = [];

    // 1. Read inputs
    const age           = parseInt(document.getElementById('lifeAge').value) || 30;
    const smoker        = document.getElementById('lifeSmoker').value;        // "yes" or "no"
    const sumAssured    = parseFloat(document.getElementById('lifeSumAssured').value) || 100000;
    const term          = parseInt(document.getElementById('lifeTerm').value) || 20;
    const healthRating  = document.getElementById('lifeHealthRating').value;  // "preferred", "standard", "substandard"

    // 2. Base premium (per $1 000)
    const ratePerThousand = smoker==='yes'
      ? DATA.baseRates.smoker
      : DATA.baseRates.nonSmoker;
    const basePremium = (sumAssured / 1000) * ratePerThousand;
    window.lifeCalculationDetails.push({
      factor:    `Base Rate (${smoker==='yes'?'Smoker':'Non-Smoker'})`,
      baseValue: `$${ratePerThousand.toFixed(2)}/1k`,
      multiplier:`${(sumAssured/1000).toFixed(2)}`,
      subtotal:  `$${basePremium.toFixed(2)}`
    });
    window.lifeAssumptions.push('Rate applied per $1 000 of coverage.');

    // 3. Age factor (interpolated)
    const ages = Object.keys(DATA.ageFactors).map(Number).sort((a,b)=>a-b);
    let ageFactor;
    if (age <= ages[0]) ageFactor = DATA.ageFactors[ages[0]];
    else if (age >= ages.at(-1)) ageFactor = DATA.ageFactors[ages.at(-1)];
    else {
      const lower = ages.filter(a=>a<=age).pop();
      const upper = ages.filter(a=>a>age)[0];
      const lf = DATA.ageFactors[lower], uf = DATA.ageFactors[upper];
      const r  = (age-lower)/(upper-lower);
      ageFactor = lf + r*(uf-lf);
    }
    const afterAge = basePremium * ageFactor;
    window.lifeCalculationDetails.push({
      factor:    'Age Factor',
      baseValue: `$${basePremium.toFixed(2)}`,
      multiplier:ageFactor.toFixed(2),
      subtotal:  `$${afterAge.toFixed(2)}`
    });
    window.lifeAssumptions.push(`Applied age factor for age ${age}.`);

    // 4. Term factor
    const termFactor = DATA.termFactors[term]||1.00;
    const afterTerm = afterAge * termFactor;
    window.lifeCalculationDetails.push({
      factor:    'Term Factor',
      baseValue: `$${afterAge.toFixed(2)}`,
      multiplier:termFactor.toFixed(2),
      subtotal:  `$${afterTerm.toFixed(2)}`
    });
    window.lifeAssumptions.push(`Term length ${term} years factor.`);

    // 5. Health rating factor
    const hFactor = DATA.healthRatingFactors[healthRating];
    const afterHealth = afterTerm * hFactor;
    window.lifeCalculationDetails.push({
      factor:    'Health Rating Factor',
      baseValue: `$${afterTerm.toFixed(2)}`,
      multiplier:hFactor.toFixed(2),
      subtotal:  `$${afterHealth.toFixed(2)}`
    });
    window.lifeAssumptions.push(`Health rating: ${healthRating}.`);

    // 6. Ontario Insurance Premium Tax (8%)
    const tax   = afterHealth * 0.08;
    const total = afterHealth + tax;
    window.lifeCalculationDetails.push({
      factor:    'Ontario Tax (8%)',
      baseValue: `$${afterHealth.toFixed(2)}`,
      multiplier:'8%',
      subtotal:  `$${tax.toFixed(2)}`
    });
    window.lifeCalculationDetails.push({
      factor:    'Total Annual Premium',
      baseValue: '',
      multiplier:'',
      subtotal:  `$${total.toFixed(2)}`
    });
    window.lifeAssumptions.push('8% provincial insurance tax included.');

    // 7. Render to UI
    document.getElementById('lifePremiumResult').textContent = `$${total.toFixed(2)}`;
    updateAssumptionsList('life');
    updateDetailsTable('life');
  }
}

// Expose init for main loader
window.initLifeInsurance = initLifeInsurance;
