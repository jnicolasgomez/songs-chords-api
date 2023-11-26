
const API_URL = 'https://b784-2800-484-777a-921a-1836-938f-5b33-da29.ngrok-free.app'
var count = 1;
var currentSate = {
    user: "dave",
    month: "octubre",
    weekend: 2,
    days: [20,21,22,23],
    shift: [[[],[],[],[]],
    [[],[],[],[]],
    [[],[],[],[]]]
}

function arrayRemove(arr, value) {
 
    return arr.filter(function (item) {
        return item != value;
    });
 
}

function setColor(btn) {
    if (currentSate.user === "todos") {
        return;
    }
    var property = document.getElementById(btn);
    let index = parseInt(btn);
    shift = currentSate.shift;
    let x =  Math.floor(index/currentSate.days.length)
    let y = index%currentSate.days.length
    if (shift[x][y].includes(currentSate.user)) {
        property.style.backgroundColor = "#FFFFFF"
        shift[x][y] = arrayRemove(shift[x][y], currentSate.user)
    }
    else {
        property.style.backgroundColor = `rgba(0,255,0, 1)`
        shift[x][y].push(currentSate.user)
    }
}

function fillColor(btn) {
    var property = document.getElementById(btn);
    let index = parseInt(btn);
    shift = currentSate.shift;
    let x =  Math.floor(index/currentSate.days.length)
    let y = index%currentSate.days.length
    if (currentSate.user === "todos") {
        opacity = shift[x][y].length/7
        property.style.backgroundColor = `rgba(0,255,0, ${opacity})`;
        if (shift[x][y].length === 7) {
            property.style.borderWidth = `thick`;
            // property.style.borderColor = `rgba(255,0,0, ${opacity})`;
        }
    }
    else if (shift[x][y].includes(currentSate.user)) {
        property.style.backgroundColor = `rgba(0,255,0, 1)`
        property.style.borderWidth = `thin`;
    }
    else {
        property.style.backgroundColor = "#FFFFFF"
        property.style.borderWidth = `thin`;
    }
}

function setUser(user) {
    currentSate.user = user;
    fillBoxes();
}


async function sendAvailability() {
    if (currentSate.user === "todos") {
        return;
    }
    if (confirm(`${currentSate.user} seguro que deseas enviar esta disponibilidad?`)) {
        let res = await fetch(`${API_URL}/api/availability`, {
            method: 'POST',
            body: JSON.stringify(currentSate),
            headers: {
                "Content-Type": "application/json",
              }
            }).then(async response => {
                if (response.status === 201) {
                    return (await response.json()).body
                } else {
                    throw new Error(`Api Request falied with status: ${response.status}`)
                }
        
             })
    } else {
        return false;
    }

}

async function getData() {
    return fetch(`${API_URL}/api/availability`).then(async response => {
        if (response.status === 200) {
            return (await response.json()).body
        } else {
            throw new Error(`Api Request falied with status: ${response.status}`)
        }
        
    })
}

function fillBoxes() {
    totalBoxes = currentSate.shift.length * currentSate.shift[0].length;
    for (let i = 0; i < totalBoxes; i++) {
        fillColor(i);
    }
}
window.onload = function(){
    getData().then(data => {
        console.log(data);
        currentSate.month = data[0].month;
        currentSate.days = data[0].days;
        currentSate.weekend = data[0].weekend;
        currentSate.shift = data[0].shift;
        document.getElementById('month').innerHTML = currentSate.month;
        document.getElementById('day1').innerHTML = data[0].days[0];
        document.getElementById('day2').innerHTML = data[0].days[1];
        document.getElementById('day3').innerHTML = data[0].days[2];
        document.getElementById('day4').innerHTML = data[0].days[3];
        fillBoxes();
    })

    
};
