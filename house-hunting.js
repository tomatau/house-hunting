import * as R from 'ramda'

console.log(import.meta.env)
const GOOGLE_SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID
const GOOGLE_MAP_API_KEY = import.meta.env.VITE_GOOGLE_MAP_API_KEY

const GOOGLE_SHEET_URL = (action = '') =>
  `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/Houses${action}?key=${GOOGLE_MAP_API_KEY}`

const GOOGLE_MAP_EMBED_URL = () =>
  `https://www.google.com/maps/embed/v1/view?key=${GOOGLE_MAP_API_KEY}&center=0,0&zoom=1`

const GOOGLE_MAP_MARKER_URL = (address = '') =>
  `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${GOOGLE_MAP_API_KEY}`

class House {
  constructor(house) {
    for (const [key, val] of R.toPairs(house)) {
      this[key] = val
    }
  }
}

function calculateRank(house) {
  house.rank = 0
}

const camelCase = (str = '') =>
  str.replace(/[-_ ]([a-z])/g, m => m[1].toUpperCase())

async function fetchHouseDataFromSheet() {
  const response = await fetch(GOOGLE_SHEET_URL())
  const data = await response.json()

  // Assuming the data is in the format [Address, Price, CustomField1, CustomField2, ...]
  const [titles, ...rows] = data.values

  const titleKeys = R.pipe(R.map(R.toLower), R.map(camelCase))(titles)

  const houses = rows.map(row => {
    const zippedRow = R.pipe(R.zipObj(titleKeys))(row)
    return new House(zippedRow)
  })

  return houses
}

async function displayOnMap(houses) {
  for (const house of houses) {
    if (!house.address) continue

    const markerUrl = GOOGLE_MAP_MARKER_URL(encodeURIComponent(house.address))

    const response = await fetch(markerUrl)
    const data = await response.json()

    const { location } = data.results[0].geometry

    const marker = new google.maps.Marker({
      position: location,
      map: window.myMap,
      title: house.address,
    })

    const infoWindow = new google.maps.InfoWindow({
      content: `
          <div class='info-window'>
            <a href='${house.link}' target='_blank'>${house.address}</a>
            <br />
            <span>${house.price}</span>
          </div>
          `,
    })

    marker.addListener('click', () => {
      infoWindow.open(map, marker)
    })
  }
}

;(async function () {
  const houses = await fetchHouseDataFromSheet()

  houses.forEach(house => calculateRank(house))

  await displayOnMap(houses)
})()
