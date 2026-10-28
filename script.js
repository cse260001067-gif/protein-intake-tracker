// ================================================
// Protein Intake Tracker - stage 1
// all the javascript is in this file. i split it into parts so its easy to find stuff
// ================================================


// ---------- PART 1: DATA ----------

// list of common foods with protein per 1 serving
// NOTE: these are rough/approx values, i need to double check them with IFCT or USDA
// before submitting and mention the source in the README
var foods = [
  { name: "Egg", serving: "1 egg", protein: 6 },
  { name: "Paneer", serving: "100 g", protein: 18 },
  { name: "Dal (cooked)", serving: "1 katori", protein: 7 },
  { name: "Chicken breast (cooked)", serving: "100 g", protein: 31 },
  { name: "Milk", serving: "1 glass (250 ml)", protein: 8 },
  { name: "Curd / dahi", serving: "1 katori (100 g)", protein: 4 },
  { name: "Roti", serving: "1 roti", protein: 3 },
  { name: "Rice (cooked)", serving: "1 katori", protein: 4 },
  { name: "Soya chunks (dry)", serving: "30 g", protein: 16 },
  { name: "Chana (boiled)", serving: "1 katori (100 g)", protein: 9 },
  { name: "Peanuts", serving: "30 g", protein: 8 },
  { name: "Almonds", serving: "10 almonds", protein: 3 },
  { name: "Fish (cooked)", serving: "100 g", protein: 20 },
  { name: "Whey protein", serving: "1 scoop", protein: 24 }
];

// these variables hold everything the app needs to remember
var profile = null;     // will become an object with weight, activity, goal, recommended and target
var entries = [];       // all the food entries (every day, not just today)
var editingId = null;   // if i am editing an entry this has its id, otherwise it stays null


// ---------- PART 2: SMALL HELPER FUNCTIONS ----------

// gives today's date like 2026-10-28
// (i am not using toISOString because that gives the UTC date and it can be wrong in india early in the morning)
function getTodayDate() {
  var d = new Date();
  var year = d.getFullYear();
  var month = d.getMonth() + 1;   // months start from 0 in js so +1
  var day = d.getDate();

  // add a 0 in front if its a single digit, like 5 -> 05
  if (month < 10) {
    month = "0" + month;
  }
  if (day < 10) {
    day = "0" + day;
  }

  return year + "-" + month + "-" + day;
}

// finds the position of an entry in the entries array using its id
// returns -1 if it cant find it
function findEntryIndex(id) {
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].id == id) {
      return i;
    }
  }
  return -1;
}


// ---------- PART 3: SAVING AND LOADING (localStorage) ----------

// localStorage can only store text, so JSON.stringify turns my data into text
function saveData() {
  localStorage.setItem("profile", JSON.stringify(profile));
  localStorage.setItem("entries", JSON.stringify(entries));
}

// and JSON.parse turns the text back into normal js data
function loadData() {
  var savedProfile = localStorage.getItem("profile");
  var savedEntries = localStorage.getItem("entries");

  // if nothing was saved before these will be null, so i check first
  if (savedProfile != null) {
    profile = JSON.parse(savedProfile);
  }
  if (savedEntries != null) {
    entries = JSON.parse(savedEntries);
  }
}


// ---------- PART 4: PROFILE AND TARGET ----------

// works out the recommended protein in grams
// idea: protein per kg of body weight depends on activity, and the goal adds a bit more
function calculateRecommended(weight, activity, goal) {
  var perKg = 0.8;   // sedentary

  if (activity == "light") {
    perKg = 1.0;
  } else if (activity == "moderate") {
    perKg = 1.2;
  } else if (activity == "heavy") {
    perKg = 1.6;
  }

  // goal adds a little extra
  if (goal == "lose") {
    perKg = perKg + 0.2;   // more protein helps when cutting
  } else if (goal == "gain") {
    perKg = perKg + 0.4;   // more protein for building muscle
  }

  return Math.round(weight * perKg);
}

// runs when i click "Calculate my target"
function saveProfile() {
  var weight = Number(document.getElementById("weight").value);
  var activity = document.getElementById("activity").value;
  var goal = document.getElementById("goal").value;
  var message = document.getElementById("profileMessage");

  // validation: weight has to be a sensible number
  // (an empty box becomes 0 so it also gets caught here)
  if (isNaN(weight) || weight < 20 || weight > 300) {
    message.textContent = "Please enter a weight between 20 and 300 kg.";
    return;
  }

  var recommended = calculateRecommended(weight, activity, goal);

  // at first the target is just the recommended one, i can change it later
  profile = {
    weight: weight,
    activity: activity,
    goal: goal,
    recommended: recommended,
    target: recommended
  };

  message.textContent = "";
  saveData();
  showScreens();
}

// runs when i click "Edit profile" - puts my old values back in the boxes
function editProfile() {
  document.getElementById("weight").value = profile.weight;
  document.getElementById("activity").value = profile.activity;
  document.getElementById("goal").value = profile.goal;
  document.getElementById("profileMessage").textContent = "";

  document.getElementById("profileSection").style.display = "block";
  document.getElementById("trackerSection").style.display = "none";
  document.getElementById("cancelProfileButton").style.display = "inline";   // so i can go back
}

// runs when i click "Use my target" (manual target)
function saveManualTarget() {
  var newTarget = Number(document.getElementById("manualTarget").value);
  var message = document.getElementById("targetMessage");

  // validation again
  if (isNaN(newTarget) || newTarget < 10 || newTarget > 500) {
    message.textContent = "Please enter a target between 10 and 500 grams.";
    return;
  }

  profile.target = Math.round(newTarget);
  document.getElementById("manualTarget").value = "";
  message.textContent = "Target updated.";
  saveData();
  updateEverything();
}

// goes back to the recommended target
function useRecommended() {
  profile.target = profile.recommended;
  document.getElementById("targetMessage").textContent = "Using the recommended target.";
  saveData();
  updateEverything();
}

// decides which part of the page to show:
// no profile yet -> show the profile form, otherwise -> show the tracker
function showScreens() {
  document.getElementById("cancelProfileButton").style.display = "none";

  if (profile == null) {
    document.getElementById("profileSection").style.display = "block";
    document.getElementById("trackerSection").style.display = "none";
  } else {
    document.getElementById("profileSection").style.display = "none";
    document.getElementById("trackerSection").style.display = "block";
    updateEverything();
  }
}


// ---------- PART 5: FOOD LIST AND FOOD FORM ----------

// fills the dropdown using the foods array
function loadFoodList() {
  var dropdown = document.getElementById("foodList");

  // first option is for typing my own food
  dropdown.innerHTML = "<option value=''>-- type my own food --</option>";

  for (var i = 0; i < foods.length; i++) {
    var option = document.createElement("option");
    option.value = i;   // the position in the foods array
    option.textContent = foods[i].name + " (" + foods[i].serving + " = " + foods[i].protein + " g)";
    dropdown.appendChild(option);
  }
}

// runs when i pick a food from the dropdown OR change the quantity
// it fills the name and works out the protein (quantity x protein per serving)
function fillFromList() {
  var chosen = document.getElementById("foodList").value;

  // if its empty it means i am typing my own food, so do nothing
  if (chosen == "") {
    return;
  }

  var food = foods[Number(chosen)];
  var quantity = Number(document.getElementById("quantity").value);

  document.getElementById("foodName").value = food.name;

  if (quantity > 0) {
    var total = Math.round(quantity * food.protein * 10) / 10;   // rounds to 1 decimal
    document.getElementById("protein").value = total;
  } else {
    document.getElementById("protein").value = "";
  }
}

// puts the form back to normal (used after adding, saving or cancelling an edit)
function clearForm() {
  document.getElementById("foodList").value = "";
  document.getElementById("foodName").value = "";
  document.getElementById("quantity").value = 1;
  document.getElementById("protein").value = "";
  document.getElementById("foodMessage").textContent = "";

  document.getElementById("formHeading").textContent = "Add food";
  document.getElementById("saveEntryButton").textContent = "Add food";
  document.getElementById("cancelEditButton").style.display = "none";

  editingId = null;
}

// runs when i click "Add food" (or "Save changes" while editing)
function saveEntry() {
  var name = document.getElementById("foodName").value.trim();   // trim removes extra spaces
  var quantity = Number(document.getElementById("quantity").value);
  var proteinText = document.getElementById("protein").value;
  var protein = Number(proteinText);
  var message = document.getElementById("foodMessage");

  // ----- validation, checking everything before saving -----
  if (name == "") {
    message.textContent = "Please enter a food name.";
    return;
  }
  if (isNaN(quantity) || quantity <= 0 || quantity > 100) {
    message.textContent = "Quantity should be more than 0 and not more than 100.";
    return;
  }
  if (proteinText == "" || isNaN(protein) || protein < 0 || protein > 500) {
    message.textContent = "Protein should be between 0 and 500 grams.";
    return;
  }

  if (editingId == null) {
    // adding a brand new entry
    var newEntry = {
      id: Date.now(),          // current time in milliseconds, so every entry gets its own id
      date: getTodayDate(),    // saving the date now so the history part is easy later
      name: name,
      quantity: quantity,
      protein: protein
    };
    entries.push(newEntry);
    clearForm();
    message.textContent = "Food added.";
  } else {
    // editing an old entry, so just change its values
    var index = findEntryIndex(editingId);
    if (index != -1) {
      entries[index].name = name;
      entries[index].quantity = quantity;
      entries[index].protein = protein;
    }
    clearForm();
    message.textContent = "Changes saved.";
  }

  saveData();
  updateEverything();
}

// runs when i click Edit on an entry - loads its values into the form
function startEdit(id) {
  var index = findEntryIndex(id);
  if (index == -1) {
    return;
  }
  var entry = entries[index];

  document.getElementById("foodList").value = "";   // so the dropdown doesnt overwrite my values
  document.getElementById("foodName").value = entry.name;
  document.getElementById("quantity").value = entry.quantity;
  document.getElementById("protein").value = entry.protein;
  document.getElementById("foodMessage").textContent = "";

  document.getElementById("formHeading").textContent = "Edit food";
  document.getElementById("saveEntryButton").textContent = "Save changes";
  document.getElementById("cancelEditButton").style.display = "inline";

  editingId = id;
  document.getElementById("foodName").focus();   // also scrolls up to the form
}

// runs when i click Delete on an entry
function deleteEntry(id) {
  var sure = confirm("Delete this food entry?");
  if (sure == false) {
    return;
  }

  var index = findEntryIndex(id);
  if (index != -1) {
    entries.splice(index, 1);   // removes 1 item at that position
  }

  // if i was editing this same entry, reset the form
  if (editingId == id) {
    clearForm();
  }

  saveData();
  updateEverything();
}


// ---------- PART 6: SHOWING THINGS ON THE PAGE ----------

// shows the recommended and current target
function updateTargetBox() {
  document.getElementById("recommendedText").textContent = profile.recommended;
  document.getElementById("targetText").textContent = profile.target;
}

// builds the list of foods eaten today
function showTodayEntries() {
  var list = document.getElementById("entryList");
  list.innerHTML = "";   // empty the old list first, then build it again

  var today = getTodayDate();
  var count = 0;

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];

    // only show entries from today
    if (entry.date == today) {
      count++;

      var li = document.createElement("li");

      var text = document.createElement("span");
      text.textContent = entry.name + " | quantity: " + entry.quantity + " | " + entry.protein + " g protein";

      var editButton = document.createElement("button");
      editButton.textContent = "Edit";
      editButton.setAttribute("onclick", "startEdit(" + entry.id + ")");

      var deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.setAttribute("onclick", "deleteEntry(" + entry.id + ")");

      li.appendChild(text);
      li.appendChild(document.createElement("br"));
      li.appendChild(editButton);
      li.appendChild(deleteButton);
      list.appendChild(li);
    }
  }

  if (count == 0) {
    list.innerHTML = "<li>Nothing logged yet today.</li>";
  }
}

// adds up today's protein and updates the progress bar
function updateSummary() {
  var today = getTodayDate();
  var total = 0;

  for (var i = 0; i < entries.length; i++) {
    if (entries[i].date == today) {
      total = total + entries[i].protein;
    }
  }
  total = Math.round(total * 10) / 10;   // avoids ugly numbers like 12.600000001

  var target = profile.target;
  var percent = Math.round((total / target) * 100);
  var remaining = Math.round((target - total) * 10) / 10;

  document.getElementById("todayText").textContent = getTodayDate();
  document.getElementById("summaryText").textContent = "Consumed: " + total + " g of " + target + " g (" + percent + "%)";

  // the bar can't go above 100 so i stop it there
  if (percent > 100) {
    document.getElementById("progressBar").value = 100;
  } else {
    document.getElementById("progressBar").value = percent;
  }

  // remaining protein message
  if (remaining > 0) {
    document.getElementById("remainingText").textContent = "Remaining: " + remaining + " g";
  } else if (remaining == 0) {
    document.getElementById("remainingText").textContent = "Target reached!";
  } else {
    document.getElementById("remainingText").textContent = "Target reached! You are " + (-remaining) + " g over.";
  }
}

// one function that refreshes all 3 parts, i call this whenever data changes
function updateEverything() {
  updateTargetBox();
  updateSummary();
  showTodayEntries();
}


// ---------- PART 7: START THE APP ----------
// this runs when the page opens
loadFoodList();   // fill the dropdown
loadData();       // get saved stuff from localStorage
showScreens();    // show the profile form or the tracker
