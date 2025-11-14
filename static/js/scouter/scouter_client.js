import { createTable } from "../create_table.js"

// global data 
let d = {};

new Sortable(document.getElementById("outer-container"), {
    animation: 150,
    ghostClass: "dragging" // add CSS class while dragging
});

new Sortable(document.getElementById("output-container"), {
    animation: 150,
    ghostClass: "dragging" // add CSS class while dragging
});

new Sortable(document.getElementById("tools-container"), {
    animation: 150,
    ghostClass: "dragging" // add CSS class while dragging
});

document.addEventListener("DOMContentLoaded", () => {
    let sendBtn = document.getElementById("sendBtn");
    let saveBtn = document.getElementById('save');
    let loadBtn = document.getElementById('load');

    const replays = document.getElementById("replays");
    const playerNames = document.getElementById("names");
    const responseP = document.getElementById("output-container");

    sendBtn.addEventListener("click", async () => {
        try {
            //delete any existing tables
            clear_children('output-container');
            clear_children('types-container');
            saveBtn.style.display = "none";
            if (replays.value === "") {
                alert("Enter replays to be scouted");
                return;
            } else if (playerNames.value === "") {
                alert("Enter names to be scouted");
                return;
            }
            // disable right away
            sendBtn.disabled = true;
            sendBtn.textContent = "Waiting...";
            const message = replays.value.trim();
            const names = playerNames.value.trim();
    
            const res = await fetch("/scout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ message, names })
            });
    
            if (!res.ok) {
                throw new Error(`Server error: ${res.status}`);
            }
    
            const data = await res.json();

            // Show error if server error
            if (data.error) {
                responseP.textContent = `Something went wrong sending your request.\n${data.error}`;
            } else {
                console.log("Successfully retrieved scouter info");
            }
            // save response as a global variable
            d = {"names": names, "replays": message, "data": data};
            create_tables(data);

            sendBtn.disabled = false;
            sendBtn.textContent = "Scout";
            saveBtn.style.display = "flex";

        } catch (err) {
            console.error(err);
            responseP.textContent = "Something went wrong sending your request.";
            sendBtn.disabled = false;
            sendBtn.textContent = "Scout";
        }
    });

    saveBtn.addEventListener("click", () => {
        saveResponse();
    });

    loadBtn.addEventListener("click", () => {
        loadResponse();
    })
});

// create elements 
function create_element_with_id(element, id) {
    let e = document.createElement(element);
    e.id = id; 
    return e;
}

function addCopyButtonToTable(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    // try header row first, then fallback to body row
    let firstRow = table.querySelector("thead tr") || table.querySelector("tr");
    if (!firstRow) return;

    // grab the last *cell* not a random element
    let lastCell = firstRow.querySelector("th:last-child, td:last-child");
    if (!lastCell) return;

    // create minimal icon element
    const icon = document.createElement("span");
    icon.className = "copy-icon";
    icon.innerHTML = "📄";
    icon.title = "Copy table";

    icon.addEventListener("click", (e) => {
        e.stopPropagation();
        copyTableToClipboard(tableId);
    });

    lastCell.style.position = "relative";
    lastCell.appendChild(icon);
}

function clear_children(id) {
    const elem = document.getElementById(id);
    if (elem) {
        elem.innerHTML = "";  // clears all children
    }
}

function create_tables(data) {
    // extract info
    const mon_info = data.mon_info;
    const winners = data.winners;
    let opponents = data.opponents;
    let cur = opponents[0].slice(0, 12);
    opponents[0] = cur;

    for (let i = 1; i < opponents.length; i++) {
        let sliced = opponents[i].slice(0, 12);
        if (sliced === cur) {
            opponents[i] = ""; // duplicate prefix → blank
        } else {
            cur = sliced;
            opponents[i] = sliced; // store sliced version
        }
    }
    const teams = data.teams;
    const type_info = data.type_counts;
    const replays = data.replays;
    console.log(data);
    console.log(replays);
    console.log(winners);
    console.log(opponents);
    const container = document.getElementById('output-container');

    // Sort and map mon_info
    const sortedMons = Object.entries(mon_info)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([mon, stats]) => ({
            "Pokemon": mon,
            "% games": `${stats.proportion}%`,
            "#": stats.count
        }));

    let types_info = []

    // loop through each types array
    type_info.forEach((element) => {
        types_info.push({ // turn each one into objects and append them to types_info
            "Type": element[0],
            "#": element[1],
            "Overall %": `${element[2]}%`
        })
    })

    //const type_info = Object.entries(type_info)

    // ===== START: EDIT =====

    // Step 1: Generate headers dynamically, adding Opponent and Winner
    const maxLength = Math.max(...teams.map(team => team.length));
    const teamHeaders = Array.from({ length: maxLength }, (_, i) => `Mon ${i + 1}`);
    const headers = ['Opponent', ...teamHeaders, 'Result']; // Final headers for the table

    // Step 2: Map teams to objects, now including opponent, winner, and replay URL
    const mappedTeams = teams.map((team, index) => {
        
        const obj = {};

        // Add opponent to the beginning of the object
        obj['Opponent'] = opponents[index];

        // Loop through team headers to add each Pokémon
        teamHeaders.forEach((header, i) => {
            obj[header] = team[i] || ""; // fill empty if team shorter
        });

        // Add winner to the end of the object
        obj['Result'] = winners[index];

        // Add the replay URL to the object; it won't be a column but will be available
        obj['Replay'] = replays[index];

        return obj;
    });
    
    // ===== END: EDIT =====


    let table_1 = createTable(["Pokemon", "% games", "#"], sortedMons, 0);
    // The call to create table 2 now uses the updated headers and data
    let table_2 = createTable(headers, mappedTeams, "mons");
    let table_3 = createTable(["Type", "#", "Overall %"], types_info, "none")
    table_1.id = "counts"
    table_2.id = "teams"
    table_3.id = "types"

    // append tables to output-container
    document.getElementById("output-container").appendChild(table_1);
    document.getElementById("output-container").appendChild(table_2);
    document.getElementById("types-container").appendChild(table_3);

    for (const t of [table_1, table_2, table_3]) {
        addCopyButtonToTable(t.id);
    }
}

function saveResponse() {
    // create modal
    const tier = document.getElementById('tier').value;
    document.getElementById('save').style.display = "none";
    localStorage.setItem(`${d.names} ${tier}`.trim(), JSON.stringify(d));

    console.log("Save successful");
}

function loadResponse() {
    const scouters = [];
    const replays = document.getElementById("replays");
    const playerNames = document.getElementById("names");
    const saveBtn = document.getElementById('save');

    // Loop through everything in localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);         // get the key name
        const value = localStorage.getItem(key); // get the string value

        try {
            const parsed = JSON.parse(value);    // try to parse JSON
            scouters.push({ key, ...parsed });   // save with its key
        } catch (err) {
            console.warn(`Skipping key ${key}, not valid JSON.`);
        }
    }

    scouters.sort((a, b) => a.names.localeCompare(b.names));

    // Create modal div
    let modal = create_element_with_id('div', 'modal');

    let p = document.createElement('p');
    p.id = 'load-description';
    // Example usage:
    const usedBytes = bytesToMB(getLocalStorageUsage());
    p.innerHTML = `Current localstorage usage: ${usedBytes}MB/5MB<br \>Select which player to load:`;
    modal.appendChild(p);
    let btnDiv = document.createElement('div');
    btnDiv.id = 'lsButtonDiv';
    modal.appendChild(btnDiv);

    scouters.forEach((player) => {
        // Create a container div for this player's buttons
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-btn-group';  // optional, for styling
    
        // --- Load button ---
        const loadBtn = document.createElement('button');
        loadBtn.innerHTML = `Load: ${player.key}`;
        loadBtn.className = 'localStorageBtn';
        loadBtn.addEventListener('click', () => {
            clear_children('output-container');
            clear_children('types-container');
            console.log(player.key);
            console.log(player.names);
            replays.value = player.replays;
            playerNames.value = player.names;
            saveBtn.style.display = "none";
        
            // get the tier string from the key
            const tierString = player.key.replace(player.names, "").trim();
        
            // set the value of the input element
            document.getElementById('tier').value = tierString;
        
            create_tables(player.data);
            modal.remove(); // close modal
        });
    
        // --- Delete button ---
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = `Delete: ${player.key}`;
        deleteBtn.className = 'localStorageBtn deleteBtn';
        deleteBtn.addEventListener('click', () => {
            localStorage.removeItem(player.key);
            playerDiv.remove(); // remove the buttons from the modal
            console.log(`Deleted scouter for ${player.names}`);
            saveBtn.style.display = "none";
        });
    
        // Append both buttons to the player div
        playerDiv.append(loadBtn, deleteBtn);
    
        // Append the player div to the button container in the modal
        btnDiv.append(playerDiv);
    });

    modal.addEventListener('click', () => {
        modal.remove();
    })

    document.body.appendChild(modal);
}

function getLocalStorageUsage() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        // each char in JS string is 2 bytes
        total += (key.length + value.length) * 2;
    }
    return total; // in bytes
}

// Convert bytes to megabytes
function bytesToMB(bytes) {
    return (bytes / 1024 / 1024).toFixed(2);
}

function normalizeWord(str) {
    return str
        .split(/\s+/) // Split by spaces
        .map(word => {
            // Capitalize each segment around dashes but keep the dash
            const segments = word.split('-').map(seg => 
                seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase()
            );
            return segments.join('-');
        })
        .join(' ');
}

function copyTableToClipboard(tableId) {
    const table = document.getElementById(tableId);
    const table_array = Array.from(table.querySelectorAll("tr"))
        .filter(tr => !tr.querySelector("th"));
    const mid = Math.ceil(table_array.length / 2);
    const tableRows1 = table_array.slice(0, mid);
    const tableRows2 = table_array.slice(mid);
    const maxRows = Math.max(tableRows1.length, tableRows2.length);

    let formulas = [];

    // Convert <td> elements into Sheets-safe entries
    const convertCells = (arr) => arr.flatMap(td => {
        const parts = [];
        
        // ===== START: EDIT =====
        const link = td.querySelector("a");

        // If an <a> tag is found, create a HYPERLINK formula
        if (link && link.href) {
            const textRaw = link.textContent.trim();
            // Sanitize the text for use inside the formula's quotes
            const cleanText = textRaw.replace(/"/g, '""'); 
            parts.push(`HYPERLINK("${link.href}", "${normalizeWord(cleanText)}")`);
        } else {
        // ===== END: EDIT =====
        
            // Original logic for images and text for cells without links
            const img = td.querySelector("img");
            if (img && img.src) {
                parts.push(`IMAGE("${img.src}")`);
            }
            const textRaw = td.textContent.trim();
            if (textRaw) {
                const clean = textRaw.replace(/"/g, '""');
                parts.push(`"${normalizeWord(clean)}"`);
            }
        } // Closing the new 'else' block

        // Ensure each td contributes something (so spacing stays consistent)
        if (parts.length === 0) return ['""'];
        return parts;
    });

    console.log(tableRows1[0]);
    console.log(tableRows2[0]);


    // Combine the two halves row by row
    for (let i = 0; i < maxRows; i++) {
        const leftCells = tableRows1[i] ? Array.from(tableRows1[i].querySelectorAll("td")) : [];
        const rightCells = tableRows2[i] ? Array.from(tableRows2[i].querySelectorAll("td")) : [];

        const leftSide = convertCells(leftCells);
        const rightSide = convertCells(rightCells);

        const combined = [...leftSide, ...rightSide];
        const rowFormula = `={${combined.join(",")}}`;
        formulas.push(rowFormula);
    }

    const output = formulas.join("\n");

    navigator.clipboard.writeText(output).then(() => {
        alert("Table copied! Paste directly into Google Sheets.");
    });
}

function copyMonsTable(tableId) {
    const table = document.getElementById(tableId);
    let tsv = "";

    table.querySelectorAll("tr").forEach(tr => {
        let row = [];
        tr.querySelectorAll("th, td").forEach(td => {
            const img = td.querySelector("img");
            if (img) {
                // Convert to Google Sheets =IMAGE("url") formula
                row.push(`=IMAGE("${img.src}")`);
            } else {
                row.push(td.textContent.trim());
            }
        });
        tsv += row.join("\t") + "\n";
    });

    navigator.clipboard.writeText(tsv).then(() => {
        alert("Table copied! Paste into Google Sheets.");
    });
}