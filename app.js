// --------------------------------------------------
// 1. DÉFINITION DES ÉTAPES DU QUESTIONNAIRE
// --------------------------------------------------

const categories = [
    {
        id: "saison",
        titre: "Saison",
        question: "Quelle saison concerne le contrôle ?",
        selection: "single"
    },

    {
        id: "cultures",
        titre: "Cultures",
        question: "Quelles cultures sont présentes sur l'exploitation ?",
        selection: "multiple"
    },

    {
        id: "bétail",
        titre: "Bétail",
        question: "Quels animaux sont présents sur l'exploitation ?",
        selection: "multiple"
    },

    {
        id: "inscriptions",
        titre: "Inscriptions",
        question: "À quels programmes l'exploitation est-elle inscrite ?",
        selection: "multiple"
    }
];


// --------------------------------------------------
// 2. DONNÉES CHARGÉES DEPUIS LES CSV
// --------------------------------------------------

let rubriques = [];
let controles = [];
let dependencies = {};
let labels = {};


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

const questionnaire =
    document.getElementById("questionnaire");

const nextButton =
    document.getElementById("nextButton");

const previousButton =
    document.getElementById("previousButton");

const progressBar =
    document.getElementById("progressBar");


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

            row[header] =
                (values[index] ?? "").trim();
        });

        return row;
    });
}


// --------------------------------------------------
// 6. CHARGEMENT DES FICHIERS CSV
// --------------------------------------------------

async function loadData() {

    const [
        rubriquesResponse,
        controlesResponse,
        dependancesResponse,
        labelsResponse
    ] = await Promise.all([

        fetch("./data/rubriques.csv"),
        fetch("./data/controles.csv"),
        fetch("./data/dependances.csv"),
        fetch("./data/labels.csv")
    ]);


    // --------------------------------------------------
    // VÉRIFICATION
    // --------------------------------------------------

    if (!rubriquesResponse.ok) {
        throw new Error(
            "Impossible de charger rubriques.csv"
        );
    }

    if (!controlesResponse.ok) {
        throw new Error(
            "Impossible de charger controles.csv"
        );
    }

    if (!dependancesResponse.ok) {
        throw new Error(
            "Impossible de charger dependances.csv"
        );
    }

    if (!labelsResponse.ok) {
        throw new Error(
            "Impossible de charger labels.csv"
        );
    }


    // --------------------------------------------------
    // LECTURE
    // --------------------------------------------------

    const rubriquesText =
        await rubriquesResponse.text();

    const controlesText =
        await controlesResponse.text();

    const dependancesText =
        await dependancesResponse.text();

    const labelsText =
        await labelsResponse.text();


    // --------------------------------------------------
    // LABELS
    // --------------------------------------------------
    //
    // Exemple :
    //
    // id;label;groupe
    // UGB_bovins;UGB bovins;betail
    // bilan_fourrager;Bilan fourrager;contrôle
    //
    // --------------------------------------------------

    const labelsRows =
        parseCSV(labelsText);

    labels = {};

    labelsRows.forEach(row => {

        labels[row.id] = {
            id: row.id,
            label: row.label,
            groupe: row.groupe
        };
    });


    // --------------------------------------------------
    // RUBRIQUES
    // --------------------------------------------------
    //
    // Exemple :
    //
    // 07.06;...;saison;été
    // 07.06;...;cultures;terres_assolées
    // 07.06;...;cultures;baies
    //
    // signifie :
    //
    // été
    // ET
    // (terres_assolées OU baies)
    //
    // --------------------------------------------------

    const rubriquesRows =
        parseCSV(rubriquesText);

    const rubriquesMap = {};

    rubriquesRows.forEach(row => {

        if (!rubriquesMap[row.id]) {

            rubriquesMap[row.id] = {
                id: row.id,
                label: row.label,
                conditions: {}
            };
        }

        if (
            !rubriquesMap[row.id]
                .conditions[row.groupe]
        ) {

            rubriquesMap[row.id]
                .conditions[row.groupe] = [];
        }

        rubriquesMap[row.id]
            .conditions[row.groupe]
            .push(row.condition);
    });

    rubriques =
        Object.values(rubriquesMap);


    // --------------------------------------------------
    // CONTRÔLES
    // --------------------------------------------------

    controles =
        parseCSV(controlesText);


    // --------------------------------------------------
    // DÉPENDANCES
    // --------------------------------------------------
    //
    // Plusieurs lignes pour une même option = OU
    //
    // Exemple :
    //
    // insc_PLVH;UGB_bovins
    // insc_PLVH;UGB_équidés
    //
    // =
    //
    // UGB_bovins OU UGB_équidés
    //
    // --------------------------------------------------

    const dependancesRows =
        parseCSV(dependancesText);

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
// 7. RÉCUPÉRER LE LABEL D'UN IDENTIFIANT
// --------------------------------------------------

function getLabel(id) {

    return labels[id]?.label ?? id;
}


// --------------------------------------------------
// 8. RÉCUPÉRER LES OPTIONS D'UN GROUPE
// --------------------------------------------------

function getOptionsForGroup(groupId) {

    return Object.values(labels)

        .filter(
            item =>
                item.groupe === groupId
        )

        .map(
            item =>
                item.id
        );
}


// --------------------------------------------------
// 9. RÉCUPÉRER TOUTES LES OPTIONS SÉLECTIONNÉES
// --------------------------------------------------

function getAllSelected() {

    return Object.values(answers).flat();
}


// --------------------------------------------------
// 10. CALCULER LES CATÉGORIES VISIBLES
// --------------------------------------------------
//
// Particularité métier :
//
// si saison = hiver,
// on ne montre pas l'étape cultures.
//
// --------------------------------------------------

function getVisibleCategories() {

    const hiver =
        answers.saison.includes("hiver");


    // Effacer les anciennes cultures
    // si l'utilisateur passe de été à hiver.

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
// 11. VÉRIFIER SI UNE OPTION EST DISPONIBLE
// --------------------------------------------------

function isOptionAvailable(optionId) {

    const dependency =
        dependencies[optionId];


    // Pas de dépendance :
    // l'option est disponible.

    if (!dependency) {
        return true;
    }


    const allSelected =
        getAllSelected();


    // Au moins une condition doit être remplie.

    return dependency.any.some(

        condition =>
            allSelected.includes(condition)
    );
}


// --------------------------------------------------
// 12. SUPPRIMER LES RÉPONSES DEVENUES IMPOSSIBLES
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
// 13. AFFICHAGE D'UNE ÉTAPE
// --------------------------------------------------

function renderStep() {

    showingResults = false;


    removeUnavailableAnswers();


    const visibleCategories =
        getVisibleCategories();


    // Sécurité si le nombre d'étapes change.

    if (
        currentStep >=
        visibleCategories.length
    ) {

        currentStep =
            visibleCategories.length - 1;
    }


    nextButton.style.display =
        "block";


    const category =
        visibleCategories[currentStep];


    questionnaire.innerHTML = `
        <h2>${category.titre}</h2>
        <p>${category.question}</p>
    `;


    // --------------------------------------------------
    // OPTIONS DU GROUPE
    // --------------------------------------------------

    const options =
        getOptionsForGroup(category.id);


    options.forEach(optionId => {


        // Ne pas afficher les options
        // dont les dépendances ne sont pas remplies.

        if (!isOptionAvailable(optionId)) {
            return;
        }


        const checked =
            answers[category.id]
                .includes(optionId)

                ? "checked"
                : "";


        const inputType =
            category.selection === "single"

                ? "radio"
                : "checkbox";


        questionnaire.innerHTML += `
            <label class="option">

                <input
                    type="${inputType}"
                    name="${category.id}"
                    value="${optionId}"
                    ${checked}
                >

                ${getLabel(optionId)}

            </label>
        `;
    });


    // --------------------------------------------------
    // GESTION DES CLICS
    // --------------------------------------------------

    const inputs =
        questionnaire.querySelectorAll("input");


    inputs.forEach(input => {

        input.addEventListener(
            "change",

            event => {

                const option =
                    event.target.value;


                // --------------------------------------
                // CHOIX UNIQUE
                // --------------------------------------

                if (
                    category.selection ===
                    "single"
                ) {

                    answers[category.id] =
                        [option];

                    return;
                }


                // --------------------------------------
                // CHOIX MULTIPLE
                // --------------------------------------

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


    // --------------------------------------------------
    // BOUTON PRÉCÉDENT
    // --------------------------------------------------

    previousButton.style.visibility =
        currentStep === 0

            ? "hidden"
            : "visible";


    // --------------------------------------------------
    // BOUTON SUIVANT
    // --------------------------------------------------

    nextButton.textContent =
        currentStep ===
        visibleCategories.length - 1

            ? "Voir le résultat"
            : "Suivant";


    // --------------------------------------------------
    // BARRE DE PROGRESSION
    // --------------------------------------------------

    const progress =
        (
            (currentStep + 1)
            /
            visibleCategories.length
        )
        * 100;


    progressBar.style.width =
        progress + "%";
}


// --------------------------------------------------
// 14. VÉRIFIER SI UNE RUBRIQUE EST APPLICABLE
// --------------------------------------------------
//
// ENTRE LES GROUPES = ET
//
// DANS UN GROUPE = OU
//
// Exemple :
//
// saison = été
//
// ET
//
// cultures =
// terres_assolées OU baies
//
// --------------------------------------------------

function rubriqueApplicable(rubrique) {

    const allSelected =
        getAllSelected();


    const groupes =
        Object.values(
            rubrique.conditions
        );


    return groupes.every(

        conditionsDuGroupe => {

            return conditionsDuGroupe.some(

                condition =>
                    allSelected.includes(
                        condition
                    )
            );
        }
    );
}


// --------------------------------------------------
// 15. RÉCUPÉRER LES CONTRÔLES D'UNE RUBRIQUE
// --------------------------------------------------

function getControles(rubriqueId) {

    return controles

        .filter(

            row =>
                row.rubrique ===
                rubriqueId
        )

        .map(

            row =>
                row.controle
        );
}


// --------------------------------------------------
// 16. AFFICHAGE DES RÉSULTATS
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


    // --------------------------------------------------
    // AUCUN RÉSULTAT
    // --------------------------------------------------

    if (results.length === 0) {

        questionnaire.innerHTML += `
            <p>
                Aucune rubrique ne correspond
                aux critères sélectionnés.
            </p>
        `;

        return;
    }


    // --------------------------------------------------
    // AFFICHAGE DES RUBRIQUES
    // --------------------------------------------------

    results.forEach(rubrique => {


        const listeControles =
            getControles(
                rubrique.id
            );


        // --------------------------------------------------
        // IMPORTANT :
        //
        // controles.csv contient les IDs.
        //
        // Exemple :
        //
        // bilan_fourrager
        //
        // On utilise getLabel() pour afficher :
        //
        // Bilan fourrager
        // --------------------------------------------------

        const controlesHTML =
            listeControles.length > 0

                ? listeControles
                    .map(

                        controleId =>
                            `<li>${getLabel(controleId)}</li>`
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
// 17. BOUTON SUIVANT
// --------------------------------------------------

nextButton.addEventListener(
    "click",

    () => {

        const visibleCategories =
            getVisibleCategories();


        if (
            currentStep <
            visibleCategories.length - 1
        ) {

            currentStep++;

            renderStep();

        } else {

            showResults();
        }
    }
);


// --------------------------------------------------
// 18. BOUTON PRÉCÉDENT
// --------------------------------------------------

previousButton.addEventListener(
    "click",

    () => {


        // --------------------------------------------------
        // RETOUR DEPUIS LES RÉSULTATS
        // --------------------------------------------------

        if (showingResults) {

            showingResults = false;


            const visibleCategories =
                getVisibleCategories();


            currentStep =
                visibleCategories.length - 1;


            renderStep();

            return;
        }


        // --------------------------------------------------
        // RETOUR NORMAL
        // --------------------------------------------------

        if (currentStep > 0) {

            currentStep--;

            renderStep();
        }
    }
);


// --------------------------------------------------
// 19. DÉMARRAGE
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
                <li>data/labels.csv</li>
            </ul>
        `;
    }
}


// --------------------------------------------------
// 20. LANCEMENT
// --------------------------------------------------

startApp();
