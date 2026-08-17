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
// 2. DONNÉES CHARGÉES DEPUIS LES FICHIERS
// --------------------------------------------------

let rubriques = [];
let controles = [];
let dependencies = {};
let labels = {};
let pointsControle = [];


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
// 6. CHARGEMENT DES FICHIERS
// --------------------------------------------------

async function loadData() {

    const [
        rubriquesResponse,
        controlesResponse,
        dependancesResponse,
        labelsResponse,
        pointsControleResponse
    ] = await Promise.all([

        fetch("./data/rubriques.csv"),
        fetch("./data/controles.csv"),
        fetch("./data/dependances.csv"),
        fetch("./data/labels.csv"),
        fetch("./data/tous_les_PC.xlsx")
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

    if (!pointsControleResponse.ok) {
        throw new Error(
            "Impossible de charger tous_les_PC.xlsx"
        );
    }


    // --------------------------------------------------
    // LECTURE DES CSV
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
    //
    // ENTRE LES GROUPES = ET
    // DANS UN GROUPE = OU
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


    // --------------------------------------------------
    // POINTS DE CONTRÔLE DEPUIS LE FICHIER XLSX
    // --------------------------------------------------

    const excelBuffer =
        await pointsControleResponse.arrayBuffer();

    const workbook =
        XLSX.read(excelBuffer, {
            type: "array"
        });


    // On prend la première feuille du classeur.

    const firstSheetName =
        workbook.SheetNames[0];

    const worksheet =
        workbook.Sheets[firstSheetName];


    // Transformation de la feuille Excel
    // en tableau d'objets JavaScript.

    pointsControle =
        XLSX.utils.sheet_to_json(
            worksheet,
            {
                defval: ""
            }
        );
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


    if (!dependency) {
        return true;
    }


    const allSelected =
        getAllSelected();


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
// DANS UN GROUPE = OU
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
// 16. RÉCUPÉRER LES POINTS DE CONTRÔLE
//     D'UNE RUBRIQUE
// --------------------------------------------------

function getPointsControle(rubriqueId) {

    return pointsControle.filter(row => {

        return String(row["id.rubrique"]).trim()
            === String(rubriqueId).trim();
    });
}


// --------------------------------------------------
// 17. ÉCHAPPER LE HTML
// --------------------------------------------------
//
// Evite qu'un texte provenant du fichier Excel
// soit interprété comme du HTML.
// --------------------------------------------------

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// --------------------------------------------------
// 18. CRÉER LE CONTENU DE L'ACCORDÉON
// --------------------------------------------------

function getPointsControleHTML(rubriqueId) {

    const lignes =
        getPointsControle(rubriqueId);


    if (lignes.length === 0) {

        return `
            <p>
                Aucun point de contrôle disponible.
            </p>
        `;
    }


    const liste =
        lignes
            .map(row => {

                const idPc =
                    escapeHTML(row["id.pc"]);

                const pcShort =
                    escapeHTML(row["pc_short"]);

                const pc =
                    escapeHTML(row["pc"]);


                return `
                    <li>
                        <u>
                            ${idPc}. ${pcShort}
                        </u>
                        :
                        <br>
                        ${pc}
                    </li>
                `;
            })
            .join("");


    return `
        <ul class="pc-list">
            ${liste}
        </ul>
    `;
}


// --------------------------------------------------
// 19. AFFICHAGE DES RÉSULTATS
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


        const controlesHTML =
            listeControles.length > 0

                ? listeControles
                    .map(

                        controleId =>
                            `<li>${getLabel(controleId)}</li>`
                    )
                    .join("")

                : "<li>Aucun contrôle défini</li>";


        // --------------------------------------------------
        // POINTS DE CONTRÔLE
        // --------------------------------------------------

        const points =
            getPointsControle(rubrique.id);


        const pointsControleHTML =
            getPointsControleHTML(
                rubrique.id
            );


        // --------------------------------------------------
        // RUBRIQUE
        // --------------------------------------------------

        questionnaire.innerHTML += `
            <div class="result">

                <h3>
                    ${rubrique.id}
                    —
                    ${rubrique.label}
                </h3>

                <strong>
                    A préparer :
                </strong>

                <ul class="control-list">
                    ${controlesHTML}
                </ul>


                <details class="pc-accordion">

                    <summary>
                        Voir les points de contrôle
                        (${points.length})
                    </summary>

                    <div class="pc-content">

                        ${pointsControleHTML}

                    </div>

                </details>

            </div>
        `;
    });
}


// --------------------------------------------------
// 20. BOUTON SUIVANT
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
// 21. BOUTON PRÉCÉDENT
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
// 22. DÉMARRAGE
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
                <li>data/tous_les_PC.xlsx</li>
            </ul>
        `;
    }
}


// --------------------------------------------------
// 23. LANCEMENT
// --------------------------------------------------

startApp();
