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
// 2. DONNÉES CHARGÉES DEPUIS LES CSV
// --------------------------------------------------

let rubriques = [];
let controles = [];
let dependencies = {};


// --------------------------------------------------
// 3. ÉTAT DE L'APPLICATION
// --------------------------------------------------

let currentStep = 0;
let showingResults = false;

const answers = {};

categories.forEach(category => {
    answers[category.id] = [];
});


// --------------------------------------------------
// 4. ÉLÉMENTS HTML
// --------------------------------------------------

const questionnaire = document.getElementById("questionnaire");
const nextButton = document.getElementById("nextButton");
const previousButton = document.getElementById("previousButton");
const progressBar = document.getElementById("progressBar");


// --------------------------------------------------
// 5. LECTURE D'UN CSV
// --------------------------------------------------

function parseCSV(text) {

    const lines = text
        .trim()
        .split(/\r?\n/)
        .filter(line => line.trim() !== "");

    const headers = lines[0]
        .split(";")
        .map(header => header.trim());

    return lines.slice(1).map(line => {

        const values = line.split(";");

        const row = {};

        headers.forEach((header, index) => {
            row[header] = (values[index] ?? "").trim();
        });

        return row;
    });
}


// --------------------------------------------------
// 6. CHARGEMENT DES 3 FICHIERS CSV
// --------------------------------------------------

async function loadData() {

    const [
        rubriquesResponse,
        controlesResponse,
        dependancesResponse
    ] = await Promise.all([
        fetch("./data/rubriques.csv"),
        fetch("./data/controles.csv"),
        fetch("./data/dependances.csv")
    ]);

    if (!rubriquesResponse.ok) {
        throw new Error("Impossible de charger rubriques.csv");
    }

    if (!controlesResponse.ok) {
        throw new Error("Impossible de charger controles.csv");
    }

    if (!dependancesResponse.ok) {
        throw new Error("Impossible de charger dependances.csv");
    }

    const rubriquesText = await rubriquesResponse.text();
    const controlesText = await controlesResponse.text();
    const dependancesText = await dependancesResponse.text();


    // --------------------------------------------------
    // RUBRIQUES
    //
    // Exemple CSV :
    //
    // 07.06;...;saison;été
    // 07.06;...;cultures;terres_assolées
    // 07.06;...;cultures;baies
    //
    // devient :
    //
    // saison = été
    // ET
    // cultures = terres_assolées OU baies
    // --------------------------------------------------

    const rubriquesRows = parseCSV(rubriquesText);

    const rubriquesMap = {};

    rubriquesRows.forEach(row => {

        if (!rubriquesMap[row.id]) {

            rubriquesMap[row.id] = {
                id: row.id,
                label: row.label,
                conditions: {}
            };
        }

        if (!rubriquesMap[row.id].conditions[row.groupe]) {

            rubriquesMap[row.id]
                .conditions[row.groupe] = [];
        }

        rubriquesMap[row.id]
            .conditions[row.groupe]
            .push(row.condition);
    });

    rubriques = Object.values(rubriquesMap);


    // --------------------------------------------------
    // CONTRÔLES
    // --------------------------------------------------

    controles = parseCSV(controlesText);


    // --------------------------------------------------
    // DÉPENDANCES
    //
    // Plusieurs lignes pour une même option = OU
    // --------------------------------------------------

    const dependancesRows = parseCSV(dependancesText);

    dependencies = {};

    dependancesRows.forEach(row => {

        if (!dependencies[row.option]) {

            dependencies[row.option] = {
                any: []
            };
        }

        dependencies[row.option]
            .any
            .push(row.condition);
    });
}


// --------------------------------------------------
// 7. RÉCUPÉRER TOUTES LES OPTIONS COCHÉES
// --------------------------------------------------

function getAllSelected() {

    return Object.values(answers).flat();
}


// --------------------------------------------------
// 8. CALCULER LES CATÉGORIES À AFFICHER
// --------------------------------------------------
//
// Particularité métier :
//
// si saison = hiver
// on ne montre pas l'étape "cultures"
// --------------------------------------------------

function getVisibleCategories() {

    const hiver =
        answers.saison.includes("hiver");

    // Si on passe en hiver,
    // on supprime d'éventuelles anciennes réponses
    // de cultures.

    if (hiver) {
        answers.cultures = [];
    }

    return categories.filter(category => {

        if (
            category.id === "cultures" &&
            hiver
        ) {
            return false;
        }

        return true;
    });
}


// --------------------------------------------------
// 9. VÉRIFIER SI UNE OPTION EST DISPONIBLE
// --------------------------------------------------

function isOptionAvailable(optionId) {

    const dependency = dependencies[optionId];

    if (!dependency) {
        return true;
    }

    const allSelected = getAllSelected();

    return dependency.any.some(
        condition =>
            allSelected.includes(condition)
    );
}


// --------------------------------------------------
// 10. NETTOYER LES RÉPONSES DEVENUES INCOMPATIBLES
// --------------------------------------------------

function removeUnavailableAnswers() {

    categories.forEach(category => {

        answers[category.id] =
            answers[category.id].filter(
                optionId =>
                    isOptionAvailable(optionId)
            );
    });
}


// --------------------------------------------------
// 11. AFFICHAGE D'UNE ÉTAPE
// --------------------------------------------------

function renderStep() {

    showingResults = false;

    removeUnavailableAnswers();

    const visibleCategories =
        getVisibleCategories();

    // Sécurité : si le nombre d'étapes a diminué,
    // on évite d'avoir un index hors limites.

    if (currentStep >= visibleCategories.length) {
        currentStep = visibleCategories.length - 1;
    }

    nextButton.style.display = "block";

    const category =
        visibleCategories[currentStep];

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
        questionnaire.querySelectorAll(
            "input[type=checkbox]"
        );

    checkboxes.forEach(checkbox => {

        checkbox.addEventListener(
            "change",
            event => {

                const option =
                    event.target.value;

                if (event.target.checked) {

                    if (
                        !answers[category.id]
                            .includes(option)
                    ) {

                        answers[category.id]
                            .push(option);
                    }

                } else {

                    answers[category.id] =
                        answers[category.id]
                            .filter(
                                value =>
                                    value !== option
                            );
                }
            }
        );
    });

    previousButton.style.visibility =
        currentStep === 0
            ? "hidden"
            : "visible";

    nextButton.textContent =
        currentStep ===
        visibleCategories.length - 1
            ? "Voir le résultat"
            : "Suivant";

    const progress =
        ((currentStep + 1)
            / visibleCategories.length)
        * 100;

    progressBar.style.width =
        progress + "%";
}


// --------------------------------------------------
// 12. VÉRIFIER SI UNE RUBRIQUE EST APPLICABLE
// --------------------------------------------------
//
// ENTRE LES GROUPES = ET
// DANS UN GROUPE = OU
//
// Exemple :
//
// saison : été
// ET
// cultures : terres_assolées OU baies
// --------------------------------------------------

function rubriqueApplicable(rubrique) {

    const allSelected = getAllSelected();

    const groupes =
        Object.values(rubrique.conditions);

    return groupes.every(
        conditionsDuGroupe => {

            return conditionsDuGroupe.some(
                condition =>
                    allSelected.includes(condition)
            );
        }
    );
}


// --------------------------------------------------
// 13. RÉCUPÉRER LES CONTRÔLES D'UNE RUBRIQUE
// --------------------------------------------------

function getControles(rubriqueId) {

    return controles
        .filter(
            row =>
                row.rubrique === rubriqueId
        )
        .map(
            row =>
                row.controle
        );
}


// --------------------------------------------------
// 14. AFFICHAGE DES RÉSULTATS
// --------------------------------------------------

function showResults() {

    showingResults = true;

    removeUnavailableAnswers();
    getVisibleCategories();

    previousButton.style.visibility =
        "visible";

    nextButton.style.display =
        "none";

    const results =
        rubriques.filter(
            rubriqueApplicable
        );

    progressBar.style.width =
        "100%";

    questionnaire.innerHTML = `
        <h2>Rubriques applicables</h2>

        <p>
            ${results.length}
            rubrique(s) correspondent
            à votre exploitation.
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

        const listeControles =
            getControles(rubrique.id);

        const controlesHTML =
            listeControles.length > 0
                ? listeControles
                    .map(
                        controle =>
                            `<li>${controle}</li>`
                    )
                    .join("")
                : "<li>Aucun contrôle défini</li>";

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
                    ${controlesHTML}
                </ul>

            </div>
        `;
    });
}


// --------------------------------------------------
// 15. BOUTON SUIVANT
// --------------------------------------------------

nextButton.addEventListener(
    "click",
    () => {

        const visibleCategories =
            getVisibleCategories();

        if (
            currentStep
            < visibleCategories.length - 1
        ) {

            currentStep++;

            renderStep();

        } else {

            showResults();
        }
    }
);


// --------------------------------------------------
// 16. BOUTON PRÉCÉDENT
// --------------------------------------------------

previousButton.addEventListener(
    "click",
    () => {

        // Depuis la page des résultats,
        // retour à la dernière étape visible.

        if (showingResults) {

            showingResults = false;

            const visibleCategories =
                getVisibleCategories();

            currentStep =
                visibleCategories.length - 1;

            renderStep();

            return;
        }

        // Retour normal.

        if (currentStep > 0) {

            currentStep--;

            renderStep();
        }
    }
);


// --------------------------------------------------
// 17. DÉMARRAGE
// --------------------------------------------------

async function startApp() {

    questionnaire.innerHTML =
        "<p>Chargement des données...</p>";

    nextButton.style.display =
        "none";

    previousButton.style.visibility =
        "hidden";

    try {

        await loadData();

        renderStep();

    } catch (error) {

        console.error(error);

        questionnaire.innerHTML = `
            <h2>Erreur</h2>

            <p>
                Impossible de charger
                les fichiers de données.
            </p>

            <p>
                Vérifiez que les fichiers suivants existent :
            </p>

            <ul>
                <li>data/rubriques.csv</li>
                <li>data/controles.csv</li>
                <li>data/dependances.csv</li>
            </ul>
        `;
    }
}

startApp();