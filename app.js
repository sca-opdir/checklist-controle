// --------------------------------------------------
// 1. QUESTIONS DU FORMULAIRE
// --------------------------------------------------

const categories = [
    {
        id: "saison",
        titre: "Saison",
        question: "Quelle saison concerne le contrôle ?",
        options: [
            { id: "été", label: "Été" },
            { id: "hiver", label: "Hiver" }
        ]
    },

    {
        id: "cultures",
        titre: "Cultures",
        question: "Quelles cultures sont présentes sur l'exploitation ?",
        options: [
            { id: "herbages", label: "Herbages" },
            { id: "cultures_pérennes", label: "Cultures pérennes" },
            { id: "vigne", label: "Vigne" },
            { id: "terres_assolées", label: "Terres assolées" },
            { id: "baies", label: "Baies" }
        ]
    },

    {
        id: "betail",
        titre: "Bétail",
        question: "Quels animaux sont présents sur l'exploitation ?",
        options: [
            { id: "UGB_bovins", label: "Bovins" },
            { id: "UGB_équidés", label: "Équidés" },
            { id: "UGB_caprins", label: "Caprins" },
            { id: "UGB_ovins", label: "Ovins" },
            { id: "UGB_porcins", label: "Porcins" },
            { id: "UGB_volailles", label: "Volaille" },
            { id: "UGB_lapins", label: "Lapins" }
        ]
    },

    {
        id: "inscriptions",
        titre: "Inscriptions",
        question: "À quels programmes l'exploitation est-elle inscrite ?",
        options: [
            { id: "insc_PLVH", label: "PLVH" },
            { id: "insc_SST", label: "SST" },
            { id: "insc_SRPA", label: "SRPA" },
            { id: "insc_MAP", label: "MAP" }
        ]
    }
];


// --------------------------------------------------
// 2. DÉPENDANCES ENTRE OPTIONS
// --------------------------------------------------

// Une option sans dépendance est toujours affichée.
//
// Une dépendance "any" signifie qu'au moins
// une des conditions doit être vraie.

const dependencies = {

    insc_PLVH: {
        any: [
            "UGB_bovins",
            "UGB_équidés"
        ]
    },

    insc_SST: {
        any: [
            "UGB_bovins",
            "UGB_équidés",
            "UGB_caprins",
            "UGB_ovins",
            "UGB_porcins",
            "UGB_volailles",
            "UGB_lapins"
        ]
    }
};


// --------------------------------------------------
// 3. RUBRIQUES DE CONTRÔLE
// --------------------------------------------------

const rubriques = [

    {
        id: "07.01_2023",
        label: "PER Généralités",

        conditions: {
            saison: ["été"],

            cultures: [
                "herbages",
                "cultures_pérennes",
                "vigne",
                "terres_assolées",
                "baies"
            ]
        },

        controles: [
            "Carnet présent",
            "Bilan fumure"
        ]
    },

    {
        id: "07.06_2021",
        label: "PER Grandes cultures et culture maraîchère : rotation des cultures",

        conditions: {
            saison: ["été"],
            cultures: ["terres_assolées"]
        },

        controles: [
            "Carnet présent",
            "Journal des traitements",
            "Visite des parcelles"
        ]
    },

    {
        id: "07.09_2021",
        label: "PER Arboriculture",

        conditions: {
            saison: ["été"],
            cultures: ["cultures_pérennes"]
        },

        controles: [
            "Carnet présent",
            "Journal des traitements",
            "Visite des parcelles"
        ]
    },

    {
        id: "07.11_2021",
        label: "PER Viticulture",

        conditions: {
            saison: ["été"],
            cultures: ["vigne"]
        },

        controles: [
            "Journal des traitements",
            "Visite des parcelles"
        ]
    },

    {
        id: "12.01_2023",
        label: "SST - Bovins et buffles d'Asie",

        conditions: {
            betail: ["UGB_bovins"]
        },

        controles: [
            "Visite des écuries"
        ]
    },

    {
        id: "12.02_2021",
        label: "SST - Équidés",

        conditions: {
            betail: ["UGB_équidés"]
        },

        controles: [
            "Visite des écuries"
        ]
    }
];


// --------------------------------------------------
// 4. ÉTAT DE L'APPLICATION
// --------------------------------------------------

let currentStep = 0;

const answers = {};

categories.forEach(category => {
    answers[category.id] = [];
});


// --------------------------------------------------
// 5. ÉLÉMENTS HTML
// --------------------------------------------------

const questionnaire = document.getElementById("questionnaire");
const nextButton = document.getElementById("nextButton");
const previousButton = document.getElementById("previousButton");
const progressBar = document.getElementById("progressBar");


// --------------------------------------------------
// 6. TEST DES DÉPENDANCES
// --------------------------------------------------

function isOptionAvailable(optionId) {

    const dependency = dependencies[optionId];

    if (!dependency) {
        return true;
    }

    const allSelected = Object.values(answers).flat();

    if (dependency.any) {
        return dependency.any.some(
            condition => allSelected.includes(condition)
        );
    }

    return true;
}


// --------------------------------------------------
// 7. AFFICHAGE D'UNE ÉTAPE
// --------------------------------------------------

function renderStep() {

    const category = categories[currentStep];

    questionnaire.innerHTML = `
        <h2>${category.titre}</h2>
        <p>${category.question}</p>
    `;

    category.options.forEach(option => {

        if (!isOptionAvailable(option.id)) {
            return;
        }

        const checked =
            answers[category.id].includes(option.id)
                ? "checked"
                : "";

        questionnaire.innerHTML += `
            <label class="option">
                <input
                    type="checkbox"
                    value="${option.id}"
                    ${checked}
                >
                ${option.label}
            </label>
        `;
    });

    const checkboxes =
        questionnaire.querySelectorAll("input[type=checkbox]");

    checkboxes.forEach(checkbox => {

        checkbox.addEventListener("change", event => {

            const option = event.target.value;

            if (event.target.checked) {

                if (!answers[category.id].includes(option)) {
                    answers[category.id].push(option);
                }

            } else {

                answers[category.id] =
                    answers[category.id].filter(
                        value => value !== option
                    );
            }
        });
    });

    previousButton.style.visibility =
        currentStep === 0
            ? "hidden"
            : "visible";

    nextButton.textContent =
        currentStep === categories.length - 1
            ? "Voir le résultat"
            : "Suivant";

    const progress =
        ((currentStep + 1) / categories.length) * 100;

    progressBar.style.width = progress + "%";
}


// --------------------------------------------------
// 8. DÉTERMINER SI UNE RUBRIQUE S'APPLIQUE
// --------------------------------------------------

function rubriqueApplicable(rubrique) {

    for (const [category, requiredValues]
        of Object.entries(rubrique.conditions)) {

        const selectedValues = answers[category];

        const match = requiredValues.some(
            value => selectedValues.includes(value)
        );

        if (!match) {
            return false;
        }
    }

    return true;
}


// --------------------------------------------------
// 9. AFFICHAGE DU RÉSULTAT
// --------------------------------------------------

function showResults() {

    const results =
        rubriques.filter(rubriqueApplicable);

    progressBar.style.width = "100%";

    questionnaire.innerHTML = `
        <h2>Rubriques applicables</h2>

        <p>
            ${results.length} rubrique(s)
            correspondent à votre exploitation.
        </p>
    `;

    if (results.length === 0) {

        questionnaire.innerHTML += `
            <p>
                Aucune rubrique ne correspond
                aux critères sélectionnés.
            </p>
        `;

        return;
    }

    results.forEach(rubrique => {

        const controles = rubrique.controles
            .map(controle => `<li>${controle}</li>`)
            .join("");

        questionnaire.innerHTML += `
            <div class="result">

                <h3>
                    ${rubrique.id}
                    —
                    ${rubrique.label}
                </h3>

                <strong>
                    Contrôles :
                </strong>

                <ul class="control-list">
                    ${controles}
                </ul>

            </div>
        `;
    });

    previousButton.style.visibility = "hidden";
    nextButton.style.display = "none";
}


// --------------------------------------------------
// 10. NAVIGATION
// --------------------------------------------------

nextButton.addEventListener("click", () => {

    if (currentStep < categories.length - 1) {

        currentStep++;
        renderStep();

    } else {

        showResults();
    }
});


previousButton.addEventListener("click", () => {

    if (currentStep > 0) {

        currentStep--;
        renderStep();
    }
});


// --------------------------------------------------
// 11. DÉMARRAGE
// --------------------------------------------------

renderStep();