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
            if (icon === "all") addImage = true;
            else if (index === icon) addImage = true;

            if (addImage) {
                const img = document.createElement("img");
                img.src = getSpriteFromName(row[key]); // your sprite URL
                img.style.width = "30px"; // optional styling
                img.style.height = "30px";
                td.appendChild(img);

                // also add text after the image if you want
                td.appendChild(document.createTextNode(" " + row[key]));
            } else {
                td.textContent = row[key];
            }

            tr.appendChild(td);
        });

        table.appendChild(tr);
    });

    return table;
}

