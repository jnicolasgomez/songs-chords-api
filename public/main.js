
var count = 1;
var boxes = [{
    active: false
},
{
    active: false
},
{
    active: false
},
{
    active: false
},
{
    active: false
},
{
    active: false
},
{
    active: false
},
{
    active: false
},
{
    active: false
},
{
    active: false
},
{
    active: false
},
{
    active: false
},]

function setColor(btn, color) {
    var property = document.getElementById(btn);
    let index = parseInt(btn);
    console.log(btn, boxes[index].active)
    if (boxes[index].active) {
        property.style.backgroundColor = "#FFFFFF"
        boxes[index].active = false;        
    }
    else {
        property.style.backgroundColor = "#7FFF00"
        boxes[index].active = true;
    }
}


function confirm() {
}