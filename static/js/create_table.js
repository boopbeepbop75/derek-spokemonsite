import { getSpriteFromName } from "./get_mon_img.js";

export function createTable(headers, rows, icon) {
    const table = document.createElement("table");

    // --- Header row ---
    const headerRow = document.createElement("tr");
    headers.forEach(text => {
        const th = document.createElement("th");
        th.textContent = text;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // --- Data rows ---
    rows.forEach(row => {
        const tr = document.createElement("tr");

        headers.forEach((key, index) => {
            const td = document.createElement("td");

            let addImage = false;
            if (icon === "all") {
                addImage = true;
            } else if (icon === "mons") {
                if (index > 0 && index < headers.length - 1) {
                    addImage = true;
                }
            } else if (index === icon) {
                addImage = true;
            }

            if (addImage) {
                const img = document.createElement("img");
                // Use a check to prevent errors if the key is empty
                if(row[key]) {
                    img.src = getSpriteFromName(row[key]); // your sprite URL
                }
                img.style.width = "40px"; // optional styling
                img.style.height = "30px";
                td.appendChild(img);

                td.appendChild(document.createTextNode(" " + row[key]));
            } else {
                // ===== START: EDIT =====
                // If this is the 'Winner' column and a Replay link exists, create a link
                if (key === 'Result' && row.Replay) {
                    const link = document.createElement('a');
                    link.href = row.Replay;
                    link.className = "replay";
                    link.textContent = row[key].toUpperCase(); // Winner's name
                    link.target = "_blank"; // Open in a new tab for better user experience
                    link.rel = "noopener noreferrer"; // Security best practice
                    td.appendChild(link);
                } else {
                    // Otherwise, just display the text content as before
                    td.textContent = row[key];
                }
                // ===== END: EDIT =====
            }

            tr.appendChild(td);
        });

        table.appendChild(tr);
    });

    return table;
}