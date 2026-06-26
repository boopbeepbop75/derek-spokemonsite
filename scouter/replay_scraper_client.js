import { getSpriteFromName } from "../get_mon_img.js";

const output_container = document.getElementById('output-container');

//global data resonse
let d = {}

document.addEventListener("DOMContentLoaded", () => {
    let sendBtn = document.getElementById("scrape");
    const threads = document.getElementById('threads');
    const tiers = document.getElementById('tier');

    sendBtn.addEventListener('click', async () => {
        try {
            if (threads.value === "") {
                alert("Enter threads to scrape from");
                return;
            }

            // clear output container
            output_container.innerHTML = ""; 

            sendBtn.innerHTML = "Waiting...";
            sendBtn.disabled = true;

            const message = threads.value.trim();
            const res = await fetch("/replay_scraper", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ "message": message, "tier": tiers.value.toLowerCase() })
            });

            if (!res.ok) {
                throw new Error(`Server error: ${res.status}`);
            }
    
            const data = await res.json();

            // Show error if server error
            if (data.error) {
                output_container.textContent = `Something went wrong sending your request.\n${data.error}`;
            } else {
                console.log("Successfully retrieved scouter info");
            }

            handle_response(data);

            sendBtn.disabled = false;
            sendBtn.textContent = "Scrape";

        } catch (err) {
            console.error(err);
            output_container.innerHTML = `Something went wrong sending your request.\n${err}`;
            sendBtn.disabled = false;
            sendBtn.textContent = "Scout";
        }
    })
})

function handle_response(scrape_data) {

    console.log(scrape_data);
    // create table
    let table = document.createElement('table');
    table.id = "scraped_replays";
    let headers = ['Player', 'Team'];
    let tr = document.createElement('tr');
    tr.id = 'headers';
    table.appendChild(tr);
    headers.forEach((element) => {
        let th = document.createElement('th');
        th.innerHTML = element;
        tr.appendChild(th);
    })

    //team objects
    scrape_data.teams.forEach(element => {
        try {
            //console.log(element);
            tr = document.createElement('tr');
            table.appendChild(tr);
            //p1 name
            const p1name = Object.keys(element)[0];
            let p1 = document.createElement('td');
            p1.innerHTML = `<a href="${element.replay}" target="_blank">${p1name}</a>`;
            tr.appendChild(p1);
            //p1 team
            let p1team = document.createElement('td');
            const p1team_html = element[p1name]
                .map(mon => `
                    <img src="${getSpriteFromName(mon)}" alt="${mon}">
                    <span style="display:none;">${mon}</span>`
                )
                .join(""); // no commas!
            p1team.innerHTML = `<a href="${element.replay}" target="_blank">${p1team_html}</a>`;
            tr.appendChild(p1team);
    
            let tr2 = document.createElement('tr');
            table.appendChild(tr2);
            // p2
            const p2name = Object.keys(element)[1];
            let p2 = document.createElement('td');
            p2.innerHTML = `<a href="${element.replay}" target="_blank">${p2name}</a>`;
    
            // p2 team
            let p2team = document.createElement('td');
            const team2 = element[p2name] || [];  // fallback if undefined
            const p2teamHTML = team2
                .map(mon => `<img src="${getSpriteFromName(mon)}" alt="${mon}">`)
                .join("");
            p2team.innerHTML = `<a href="${element.replay}" target="_blank">${p2teamHTML}</a>`;
            // append in your preferred order
            tr2.appendChild(p2);
            tr2.appendChild(p2team);
        } catch (err) {
            console.log(`error: ${err}`);
        }
    });

    output_container.appendChild(table);

    // attach search listener AFTER table is created
    const searchBar = document.getElementById("searchBar");
    searchBar.addEventListener("input", function () {
        const filter = searchBar.value.toLowerCase();
        const rows = table.querySelectorAll("tr:not(#headers)");

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(filter) ? "" : "none";
        });
    });
}