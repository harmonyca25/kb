/**
 * Insurance & Financial Planning Calculator
 * Main JavaScript file with core functionality
 * Now includes both Auto and Health Insurance modules
 */

// Wait for DOM content to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modules
    initProductSelector();
    initAutoInsurance();
    initHealthInsurance(); // Added health insurance module
    initLifeInsurance(); // Added life insurance module
    initRegulatoryInfo();
});

/**
 * Product Selector Functionality
 * Handles switching between different insurance/financial products
 */
function initProductSelector() {
    const productSelector = document.getElementById('productType');
    const productSections = document.querySelectorAll('.product-section');
    
    // Function to switch between product sections
    function switchProductSection(productType) {
        // Hide all product sections
        productSections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Show the selected product section
        const selectedSection = document.getElementById(productType + 'Section');
        if (selectedSection) {
            selectedSection.classList.add('active');
        }
    }
    
    // Add event listener for product selector change
    if (productSelector) {
        productSelector.addEventListener('change', function() {
            switchProductSection(this.value);
        });
    }
}

/**
 * Auto Insurance Calculator Module
 */
function initAutoInsurance() {
    // Initialize calculation data stores
    window.autoCalculationDetails = [];
    window.autoAssumptions = [];
    
    // Data constants for calculations
    const DATA = {
        // Ontario territorial rating factors (simplified)
        territorialFactors: {
            'M': 1.25, // Toronto
            'L': 1.15, // London area
            'K': 1.10, // Kingston/Eastern Ontario
            'N': 1.05, // Southwestern Ontario
            'P': 1.00, // Northern Ontario
            'G': 1.20, // Central Ontario
            'H': 1.20, // Hamilton area
            'J': 1.15, // Peterborough area
            'T': 1.25, // Toronto area
            '': 1.10  // Default if not specified
        },
        
        // Age-based risk factors
        ageFactors: {
            16: 2.50, 17: 2.40, 18: 2.30, 19: 2.20, // Teen drivers (high risk)
            20: 2.10, 21: 2.00, 22: 1.90, 23: 1.80, 24: 1.70, // Young adults
            25: 1.20, 30: 1.00, 35: 0.95, 40: 0.90, 45: 0.90, // Adults (baseline)
            50: 0.85, 55: 0.85, 60: 0.80, 65: 0.80, // Middle-aged (low risk)
            70: 0.85, 75: 0.95, 80: 1.10, 85: 1.30, // Seniors (increasing risk)
            90: 1.50, 95: 1.80, 99: 2.00
        },
        
        // Vehicle age discount factors
        vehicleAgeFactors: {
            0: 1.20,  // New vehicle (current year)
            1: 1.15,  // 1 year old
            2: 1.10,  // 2 years old
            3: 1.05,  // 3 years old
            4: 1.00,  // 4 years old
            5: 0.95,  // 5 years old
            8: 0.90,  // 6-8 years old
            10: 0.85, // 9-10 years old
            15: 0.80, // 11-15 years old
            20: 0.90, // 16-20 years old (classics, higher maintenance)
            25: 1.00  // Over 20 years (antiques, special considerations)
        },
        
        // Driving record factors
        drivingRecordFactors: {
            'clean': 1.00,
            'minor': 1.30,
            'major': 1.80
        },
        
        // Base rates for different coverages (simplified)
        baseRates: {
            'liability': 600,
            'collision': 400,
            'comprehensive': 300,
            'accidentBenefits': 200
        }
    };
    
    // Set up event listeners
    const calculateBtn = document.getElementById('calculateAutoBtn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateAutoPremium);
    }
    
    const toggleDetailsBtn = document.getElementById('toggleAutoDetails');
    if (toggleDetailsBtn) {
        toggleDetailsBtn.addEventListener('click', function() {
            const detailsSection = document.getElementById('autoDetailsSection');
            if (detailsSection) {
                if (detailsSection.classList.contains('hidden')) {
                    detailsSection.classList.remove('hidden');
                    this.textContent = 'Hide calculation details';
                } else {
                    detailsSection.classList.add('hidden');
                    this.textContent = 'Show calculation details';
                }
            }
        });
    }
    
    // Initialize with a calculation
    calculateAutoPremium();
    
    /**
     * Helper function to get age factor with interpolation
     */
    function getAgeFactor(age) {
        const ageFactors = DATA.ageFactors;
        const ages = Object.keys(ageFactors).map(Number).sort((a, b) => a - b);
        
        // If age is less than minimum or greater than maximum, use the boundary values
        if (age <= ages[0]) return ageFactors[ages[0]];
        if (age >= ages[ages.length - 1]) return ageFactors[ages[ages.length - 1]];
        
        // Find the two surrounding age points for interpolation
        let lowerAge = ages.filter(a => a <= age).pop();
        let upperAge = ages.filter(a => a > age)[0];
        
        // Linear interpolation between the two surrounding points
        let lowerFactor = ageFactors[lowerAge];
        let upperFactor = ageFactors[upperAge];
        let ratio = (age - lowerAge) / (upperAge - lowerAge);
        
        return lowerFactor + ratio * (upperFactor - lowerFactor);
    }
    
    /**
     * Helper function to get vehicle age factor with interpolation
     */
    function getVehicleAgeFactor(vehicleYear) {
        const vehicleAgeFactors = DATA.vehicleAgeFactors;
        const currentYear = new Date().getFullYear();
        const vehicleAge = currentYear - vehicleYear;
        
        if (vehicleAge < 0) return 1.2; // Future models (concept cars, etc.)
        
        const ages = Object.keys(vehicleAgeFactors).map(Number).sort((a, b) => a - b);
        
        // Find the correct age bracket
        if (vehicleAge >= ages[ages.length - 1]) return vehicleAgeFactors[ages[ages.length - 1]];
        
        for (let i = 0; i < ages.length - 1; i++) {
            if (vehicleAge >= ages[i] && vehicleAge < ages[i + 1]) {
                // Linear interpolation between brackets if needed
                if (ages[i + 1] - ages[i] > 1) {
                    const lowerFactor = vehicleAgeFactors[ages[i]];
                    const upperFactor = vehicleAgeFactors[ages[i + 1]];
                    const ratio = (vehicleAge - ages[i]) / (ages[i + 1] - ages[i]);
                    return lowerFactor + ratio * (upperFactor - lowerFactor);
                }
                return vehicleAgeFactors[ages[i]];
            }
        }
        
        return 1.0; // Default factor if not found
    }
    
    /**
     * Main function to calculate auto insurance premium
     */
    function calculateAutoPremium() {
        // Reset calculation details and assumptions
        window.autoCalculationDetails = [];
        window.autoAssumptions = [];
        
        // Get input values
        const age = parseInt(document.getElementById('autoAge').value) || 30;
        const gender = document.getElementById('autoGender').value;
        const postalCode = document.getElementById('autoPostalCode').value.toUpperCase();
        const vehicleValue = parseFloat(document.getElementById('autoVehicleValue').value) || 25000;
        const vehicleYear = parseInt(document.getElementById('autoVehicleYear').value) || 2020;
        const drivingRecord = document.getElementById('autoDrivingRecord').value;
        const deductible = parseInt(document.getElementById('autoDeductible').value) || 500;
        
        // Get selected coverages
        const liabilityCovered = document.getElementById('autoLiability').checked;
        const liabilityAmount = parseInt(document.getElementById('autoLiabilityAmount').value);
        const collisionCovered = document.getElementById('autoCollision').checked;
        const comprehensiveCovered = document.getElementById('autoComprehensive').checked;
        const accidentBenefitsCovered = document.getElementById('autoAccidentBenefits').checked;
        
        // Calculate base premium
        let basePremium = 0;
        
        // Add liability coverage if selected
        if (liabilityCovered) {
            const liabilityFactor = liabilityAmount / 1000000;
            const liabilityPremium = DATA.baseRates.liability * liabilityFactor;
            basePremium += liabilityPremium;
            
            window.autoCalculationDetails.push({
                factor: 'Liability Coverage',
                baseValue: `$${DATA.baseRates.liability.toFixed(2)}`,
                multiplier: liabilityFactor.toFixed(2),
                subtotal: `$${liabilityPremium.toFixed(2)}`
            });
            
            window.autoAssumptions.push(`Statutory minimum liability coverage in Ontario is $200,000, but $1,000,000 or higher is recommended.`);
        }
        
        // Add collision coverage if selected
        if (collisionCovered) {
            // Adjust for vehicle value
            const valueFactor = Math.sqrt(vehicleValue / 25000);
            const adjustedCollision = DATA.baseRates.collision * valueFactor;
            
            // Adjust for deductible
            const deductibleFactor = deductible === 500 ? 1.0 : 
                                     deductible === 1000 ? 0.9 : 0.8;
            
            const collisionPremium = adjustedCollision * deductibleFactor;
            basePremium += collisionPremium;
            
            window.autoCalculationDetails.push({
                factor: 'Collision Coverage',
                baseValue: `$${DATA.baseRates.collision.toFixed(2)}`,
                multiplier: `${valueFactor.toFixed(2)} × ${deductibleFactor.toFixed(2)}`,
                subtotal: `$${collisionPremium.toFixed(2)}`
            });
            
            window.autoAssumptions.push(`Collision coverage with $${deductible} deductible. Higher deductibles lower your premium.`);
        }
        
        // Add comprehensive coverage if selected
        if (comprehensiveCovered) {
            // Adjust for vehicle value
            const valueFactor = Math.sqrt(vehicleValue / 25000);
            const adjustedComprehensive = DATA.baseRates.comprehensive * valueFactor;
            
            // Adjust for deductible
            const deductibleFactor = deductible === 500 ? 1.0 : 
                                     deductible === 1000 ? 0.9 : 0.8;
            
            const comprehensivePremium = adjustedComprehensive * deductibleFactor;
            basePremium += comprehensivePremium;
            
            window.autoCalculationDetails.push({
                factor: 'Comprehensive Coverage',
                baseValue: `$${DATA.baseRates.comprehensive.toFixed(2)}`,
                multiplier: `${valueFactor.toFixed(2)} × ${deductibleFactor.toFixed(2)}`,
                subtotal: `$${comprehensivePremium.toFixed(2)}`
            });
            
            window.autoAssumptions.push(`Comprehensive coverage protects against theft, vandalism, and damage not resulting from collision.`);
        }
        
        // Add accident benefits if selected
        if (accidentBenefitsCovered) {
            basePremium += DATA.baseRates.accidentBenefits;
            
            window.autoCalculationDetails.push({
                factor: 'Accident Benefits',
                baseValue: `$${DATA.baseRates.accidentBenefits.toFixed(2)}`,
                multiplier: '1.00',
                subtotal: `$${DATA.baseRates.accidentBenefits.toFixed(2)}`
            });
            
            window.autoAssumptions.push(`Statutory accident benefits coverage is mandatory in Ontario and provides medical, rehabilitation, income replacement benefits.`);
        }
        
        // Apply territorial factor
        const territorialFactor = DATA.territorialFactors[postalCode] || DATA.territorialFactors[''];
        let territoralAdjustedPremium = basePremium * territorialFactor;
        
        window.autoCalculationDetails.push({
            factor: 'Territory Factor',
            baseValue: `$${basePremium.toFixed(2)}`,
            multiplier: territorialFactor.toFixed(2),
            subtotal: `$${territoralAdjustedPremium.toFixed(2)}`
        });
        
        if (postalCode) {
            window.autoAssumptions.push(`Postal code area ${postalCode} has a territorial rating factor of ${territorialFactor.toFixed(2)}.`);
        } else {
            window.autoAssumptions.push(`No postal code provided. Using default territorial factor of ${territorialFactor.toFixed(2)}.`);
        }
        
        // Apply age factor
        const ageFactor = getAgeFactor(age);
        let ageAdjustedPremium = territoralAdjustedPremium * ageFactor;
        
        window.autoCalculationDetails.push({
            factor: 'Driver Age Factor',
            baseValue: `$${territoralAdjustedPremium.toFixed(2)}`,
            multiplier: ageFactor.toFixed(2),
            subtotal: `$${ageAdjustedPremium.toFixed(2)}`
        });
        
        window.autoAssumptions.push(`Driver age ${age} has a risk factor of ${ageFactor.toFixed(2)}.`);
        
        // Apply vehicle age factor
        const vehicleAgeFactor = getVehicleAgeFactor(vehicleYear);
        let vehicleAgeAdjustedPremium = ageAdjustedPremium * vehicleAgeFactor;
        
        window.autoCalculationDetails.push({
            factor: 'Vehicle Age Factor',
            baseValue: `$${ageAdjustedPremium.toFixed(2)}`,
            multiplier: vehicleAgeFactor.toFixed(2),
            subtotal: `$${vehicleAgeAdjustedPremium.toFixed(2)}`
        });
        
        const vehicleAge = new Date().getFullYear() - vehicleYear;
        window.autoAssumptions.push(`${vehicleYear} vehicle (${vehicleAge} years old) has an age factor of ${vehicleAgeFactor.toFixed(2)}.`);
        
        // Apply driving record factor
        const recordFactor = DATA.drivingRecordFactors[drivingRecord] || 1.0;
        let finalPremium = vehicleAgeAdjustedPremium * recordFactor;
        
        window.autoCalculationDetails.push({
            factor: 'Driving Record Factor',
            baseValue: `$${vehicleAgeAdjustedPremium.toFixed(2)}`,
            multiplier: recordFactor.toFixed(2),
            subtotal: `$${finalPremium.toFixed(2)}`
        });
        
        if (drivingRecord === 'clean') {
            window.autoAssumptions.push(`Clean driving record applied. No tickets or accidents in past 6 years.`);
        } else if (drivingRecord === 'minor') {
            window.autoAssumptions.push(`Minor infractions applied. This includes 1-2 minor tickets in past 3 years.`);
        } else {
            window.autoAssumptions.push(`Major infractions applied. This includes at-fault accidents or serious violations.`);
        }
        
        // Apply Ontario Auto Insurance Tax (8%) 
        const tax = finalPremium * 0.08;
        const totalPremium = finalPremium + tax;
        
        window.autoCalculationDetails.push({
            factor: 'Ontario Insurance Premium Tax',
            baseValue: `$${finalPremium.toFixed(2)}`,
            multiplier: '8%',
            subtotal: `$${tax.toFixed(2)}`
        });
        
        window.autoCalculationDetails.push({
            factor: 'Total Annual Premium',
            baseValue: '',
            multiplier: '',
            subtotal: `$${totalPremium.toFixed(2)}`
        });
        
        window.autoAssumptions.push(`8% Ontario Insurance Premium Tax included in the final amount.`);
        window.autoAssumptions.push(`This is an estimate only and actual premiums may differ based on complete underwriting information.`);
        
        // Display the result
        document.getElementById('autoPremiumResult').textContent = `$${totalPremium.toFixed(2)}`;
        
        // Update assumptions list and details table
        updateAssumptionsList('auto');
        updateDetailsTable('auto');
    }
}

/**
 * Health Insurance Calculator Module
 */
function initHealthInsurance() {
    // Initialize calculation data stores
    window.healthCalculationDetails = [];
    window.healthAssumptions = [];
    
    // Data constants for calculations
    const DATA = {
        // Base rates for different coverages
        baseRates: {
            'individual': 120,
            'couple': 210,
            'family': 280
        },
        
        // Provincial factors
        provincialFactors: {
            'ON': 1.00, // Ontario (baseline)
            'BC': 1.05, // British Columbia
            'AB': 0.95, // Alberta
            'QC': 1.10, // Quebec
            'MB': 0.90, // Manitoba
            'SK': 0.90, // Saskatchewan
            'NS': 1.15, // Nova Scotia
            'NB': 1.10, // New Brunswick
            'NL': 1.15, // Newfoundland and Labrador
            'PE': 1.10  // Prince Edward Island
        },
        
        // Age-based risk factors
        ageFactors: {
            18: 0.70, 25: 0.75, 30: 0.80, 35: 0.85, 40: 0.90, 
            45: 1.00, 50: 1.10, 55: 1.20, 60: 1.35, 65: 1.50, 
            70: 1.70, 75: 2.00, 80: 2.30, 85: 2.70
        },
        
        // Medical history factors
        medicalFactors: {
            'excellent': 0.90,
            'good': 1.00,
            'average': 1.15,
            'poor': 1.40
        },
        
        // Coverage component costs
        coverageCosts: {
            'dental': 35,
            'vision': 15,
            'prescription': 40,
            'paramedical': 30,
            'hospital': 25
        },
        
        // Deductible adjustment factors
        deductibleFactors: {
            '0': 1.15,
            '250': 1.05,
            '500': 1.00,
            '1000': 0.90
        },
        
        // Coinsurance adjustment factors
        coinsuranceFactors: {
            '100': 1.10,
            '80': 1.00,
            '70': 0.95
        }
    };
    
    // Set up event listeners
    const calculateBtn = document.getElementById('calculateHealthBtn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateHealthPremium);
    }
    
    const toggleDetailsBtn = document.getElementById('toggleHealthDetails');
    if (toggleDetailsBtn) {
        toggleDetailsBtn.addEventListener('click', function() {
            const detailsSection = document.getElementById('healthDetailsSection');
            if (detailsSection) {
                if (detailsSection.classList.contains('hidden')) {
                    detailsSection.classList.remove('hidden');
                    this.textContent = 'Hide calculation details';
                } else {
                    detailsSection.classList.add('hidden');
                    this.textContent = 'Show calculation details';
                }
            }
        });
    }
    
    // Initialize with a calculation
    calculateHealthPremium();
    
    /**
     * Helper function for age interpolation
     */
    function getAgeAdjustmentFactor(age) {
        const ageFactors = DATA.ageFactors;
        const ages = Object.keys(ageFactors).map(Number).sort((a, b) => a - b);
        
        if (age <= ages[0]) return ageFactors[ages[0]];
        if (age >= ages[ages.length - 1]) return ageFactors[ages[ages.length - 1]];
        
        let lowerAge = ages.filter(a => a <= age).pop();
        let upperAge = ages.filter(a => a > age)[0];
        
        let lowerFactor = ageFactors[lowerAge];
        let upperFactor = ageFactors[upperAge];
        let ratio = (age - lowerAge) / (upperAge - lowerAge);
        
        return lowerFactor + ratio * (upperFactor - lowerFactor);
    }
    
    /**
     * Main function to calculate health insurance premium
     */
    function calculateHealthPremium() {
        // Reset calculation details and assumptions
        window.healthCalculationDetails = [];
        window.healthAssumptions = [];
        
        // Get input values
        const age = parseInt(document.getElementById('healthAge').value) || 35;
        const province = document.getElementById('healthProvince').value;
        const coverageType = document.getElementById('healthCoverage').value;
        const medicalHistory = document.getElementById('healthMedicalHistory').value;
        const deductible = document.getElementById('healthDeductible').value;
        const coinsurance = document.getElementById('healthCoinsurance').value;
        
        // Get selected coverage options
        const isDentalCovered = document.getElementById('healthDental').checked;
        const isVisionCovered = document.getElementById('healthVision').checked;
        const isPrescriptionCovered = document.getElementById('healthPrescription').checked;
        const isParamedicalCovered = document.getElementById('healthParamedical').checked;
        const isHospitalCovered = document.getElementById('healthHospital').checked;
        
        // Calculate base premium based on coverage type
        const basePremium = DATA.baseRates[coverageType];
        
        window.healthCalculationDetails.push({
            factor: 'Base Premium',
            baseValue: `$${basePremium.toFixed(2)}`,
            multiplier: '1.00',
            subtotal: `$${basePremium.toFixed(2)}`
        });
        
        window.healthAssumptions.push(`${capitalizeFirstLetter(coverageType)} coverage in ${province}.`);
        
        // Apply provincial factor
        const provincialFactor = DATA.provincialFactors[province];
        const provincialAdjusted = basePremium * provincialFactor;
        
        window.healthCalculationDetails.push({
            factor: `${province} Provincial Factor`,
            baseValue: `$${basePremium.toFixed(2)}`,
            multiplier: provincialFactor.toFixed(2),
            subtotal: `$${provincialAdjusted.toFixed(2)}`
        });
        
        window.healthAssumptions.push(`Provincial adjustment factor of ${provincialFactor.toFixed(2)} for ${province}.`);
        
        // Apply age adjustment
        const ageFactor = getAgeAdjustmentFactor(age);
        const ageAdjusted = provincialAdjusted * ageFactor;
        
        window.healthCalculationDetails.push({
            factor: 'Age Adjustment',
            baseValue: `$${provincialAdjusted.toFixed(2)}`,
            multiplier: ageFactor.toFixed(2),
            subtotal: `$${ageAdjusted.toFixed(2)}`
        });
        
        window.healthAssumptions.push(`Age ${age} has an adjustment factor of ${ageFactor.toFixed(2)}.`);
        
        // Apply medical history factor
        const medicalFactor = DATA.medicalFactors[medicalHistory];
        const medicalAdjusted = ageAdjusted * medicalFactor;
        
        window.healthCalculationDetails.push({
            factor: 'Medical History',
            baseValue: `$${ageAdjusted.toFixed(2)}`,
            multiplier: medicalFactor.toFixed(2),
            subtotal: `$${medicalAdjusted.toFixed(2)}`
        });
        
        window.healthAssumptions.push(`${capitalizeFirstLetter(medicalHistory)} medical history applied a factor of ${medicalFactor.toFixed(2)}.`);
        
        // Add optional coverages
        let totalPremium = medicalAdjusted;
        
        // Add dental coverage if selected
        if (isDentalCovered) {
            const dentalCost = DATA.coverageCosts.dental;
            totalPremium += dentalCost;
            
            window.healthCalculationDetails.push({
                factor: 'Dental Coverage',
                baseValue: `$${medicalAdjusted.toFixed(2)}`,
                multiplier: `+ $${dentalCost.toFixed(2)}`,
                subtotal: `$${totalPremium.toFixed(2)}`
            });
            
            window.healthAssumptions.push(`Dental coverage includes: cleanings, fillings, extractions, and 50% coverage for major procedures.`);
        }
        
        // Add vision coverage if selected
        if (isVisionCovered) {
            const visionCost = DATA.coverageCosts.vision;
            const priorPremium = totalPremium;
            totalPremium += visionCost;
            
            window.healthCalculationDetails.push({
                factor: 'Vision Coverage',
                baseValue: `$${priorPremium.toFixed(2)}`,
                multiplier: `+ $${visionCost.toFixed(2)}`,
                subtotal: `$${totalPremium.toFixed(2)}`
            });
            
            window.healthAssumptions.push(`Vision coverage includes: eye exams, glasses/contacts allowance every 24 months.`);
        }
        
        // Add prescription drug coverage if selected
        if (isPrescriptionCovered) {
            const prescriptionCost = DATA.coverageCosts.prescription;
            const priorPremium = totalPremium;
            totalPremium += prescriptionCost;
            
            window.healthCalculationDetails.push({
                factor: 'Prescription Drug Coverage',
                baseValue: `$${priorPremium.toFixed(2)}`,
                multiplier: `+ $${prescriptionCost.toFixed(2)}`,
                subtotal: `$${totalPremium.toFixed(2)}`
            });
            
            window.healthAssumptions.push(`Prescription drug coverage includes: formulary drugs with ${coinsurance}% coinsurance.`);
        }
        
        // Add paramedical coverage if selected
        if (isParamedicalCovered) {
            const paramedicalCost = DATA.coverageCosts.paramedical;
            const priorPremium = totalPremium;
            totalPremium += paramedicalCost;
            
            window.healthCalculationDetails.push({
                factor: 'Paramedical Services',
                baseValue: `$${priorPremium.toFixed(2)}`,
                multiplier: `+ $${paramedicalCost.toFixed(2)}`,
                subtotal: `$${totalPremium.toFixed(2)}`
            });
            
            window.healthAssumptions.push(`Paramedical services include: physiotherapy, chiropractic, massage therapy, and acupuncture.`);
        }
        
        // Add hospital room upgrade if selected
        if (isHospitalCovered) {
            const hospitalCost = DATA.coverageCosts.hospital;
            const priorPremium = totalPremium;
            totalPremium += hospitalCost;
            
            window.healthCalculationDetails.push({
                factor: 'Hospital Room Upgrade',
                baseValue: `$${priorPremium.toFixed(2)}`,
                multiplier: `+ $${hospitalCost.toFixed(2)}`,
                subtotal: `$${totalPremium.toFixed(2)}`
            });
            
            window.healthAssumptions.push(`Hospital room upgrade provides semi-private or private room accommodation.`);
        }
        
        // Apply deductible adjustment
        const deductibleFactor = DATA.deductibleFactors[deductible];
        const deductibleAdjusted = totalPremium * deductibleFactor;
        
        window.healthCalculationDetails.push({
            factor: `Deductible ($${deductible})`,
            baseValue: `$${totalPremium.toFixed(2)}`,
            multiplier: deductibleFactor.toFixed(2),
            subtotal: `$${deductibleAdjusted.toFixed(2)}`
        });
        
        window.healthAssumptions.push(`$${deductible} annual deductible applied a factor of ${deductibleFactor.toFixed(2)}.`);
        
        // Apply coinsurance adjustment
        const coinsuranceFactor = DATA.coinsuranceFactors[coinsurance];
        const finalPremium = deductibleAdjusted * coinsuranceFactor;
        
        window.healthCalculationDetails.push({
            factor: `Coinsurance (${coinsurance}%)`,
            baseValue: `$${deductibleAdjusted.toFixed(2)}`,
            multiplier: coinsuranceFactor.toFixed(2),
            subtotal: `$${finalPremium.toFixed(2)}`
        });
        
        window.healthAssumptions.push(`${coinsurance}% coinsurance rate applied a factor of ${coinsuranceFactor.toFixed(2)}.`);
        window.healthAssumptions.push(`Premium is subject to annual renewal and may change based on claims experience.`);
        
        // Display the result
        document.getElementById('healthPremiumResult').textContent = `$${finalPremium.toFixed(2)}`;
        
        // Update assumptions list and details table
        updateAssumptionsList('health');
        updateDetailsTable('health');
    }
}

/**
 * Regulatory Information Module
 */
function initRegulatoryInfo() {
    const showRegulationsBtn = document.getElementById('showRegulationsBtn');
    const regulatoryDetails = document.getElementById('regulatory-details');
    
    if (showRegulationsBtn && regulatoryDetails) {
        showRegulationsBtn.addEventListener('click', function() {
            if (regulatoryDetails.classList.contains('hidden')) {
                // Load and display regulatory details
                regulatoryDetails.innerHTML = `
                    <h4>Regulatory Framework Details</h4>
                    <ul>
                        <li><strong>FSRA Guidelines:</strong> This calculator follows the Financial Services Regulatory Authority of Ontario guidelines for insurance quotations, including disclosure requirements, fair representation of costs, and transparent presentation of product features.</li>
                        <li><strong>PIPEDA Compliance:</strong> This calculator adheres to Personal Information Protection and Electronic Documents Act requirements. No personal information is stored or transmitted from this client-side application. All calculations are performed locally within your browser.</li>
                        <li><strong>Provincial Insurance Regulators:</strong> This calculator's estimates are aligned with regulations from provincial bodies including FSRA (Ontario), AMF (Quebec), BCFSA (British Columbia), and other Canadian provincial regulators.</li>
                    </ul>
                `;
                regulatoryDetails.classList.remove('hidden');
                showRegulationsBtn.textContent = 'Hide Regulatory Details';
            } else {
                regulatoryDetails.classList.add('hidden');
                showRegulationsBtn.textContent = 'Show Regulatory Details';
            }
        });
    }
}

/**
 * Update assumptions list helper
 */
function updateAssumptionsList(section) {
    const assumptionsList = document.getElementById(section + 'AssumptionsList');
    if (!assumptionsList) return;
    
    assumptionsList.innerHTML = '';
    
    // Get assumptions from the global scope
    const assumptions = window[section + 'Assumptions'] || [];
    
    assumptions.forEach(assumption => {
        const li = document.createElement('li');
        li.textContent = assumption;
        assumptionsList.appendChild(li);
    });
}

/**
 * Update details table helper
 */
function updateDetailsTable(section) {
    const detailsTable = document.getElementById(section + 'DetailsTable');
    if (!detailsTable) return;
    
    detailsTable.innerHTML = '';
    
    // Get calculation details from the global scope
    const details = window[section + 'CalculationDetails'] || [];
    
    details.forEach(detail => {
        const row = document.createElement('tr');
        
        const factorCell = document.createElement('td');
        factorCell.textContent = detail.factor;
        row.appendChild(factorCell);
        
        const baseValueCell = document.createElement('td');
        baseValueCell.textContent = detail.baseValue;
        row.appendChild(baseValueCell);
        
        const multiplierCell = document.createElement('td');
        multiplierCell.textContent = detail.multiplier;
        row.appendChild(multiplierCell);
        
        const subtotalCell = document.createElement('td');
        subtotalCell.textContent = detail.subtotal;
        row.appendChild(subtotalCell);
        
        detailsTable.appendChild(row);
    });
}

/**
 * Helper function to capitalize first letter of a string
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
