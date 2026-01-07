   function countCash() {
      let amount = document.getElementById("amount").value;
      let result = "";

      if (amount === "" || amount <= 0) {
        document.getElementById("result").innerText =
          "Please valid amount enter karo";
        return;
      }

      let notes = [5000, 1000, 500, 100, 50, 20, 10];

      for (let note of notes) {
        let count = Math.floor(amount / note);
        if (count > 0) {
          result += note + " ke notes: " + count + "<br>";
          amount = amount % note;
        }
      }

      document.getElementById("result").innerHTML = result;
    }