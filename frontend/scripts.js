document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("patientForm");
  const status = document.getElementById("formStatus");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("name").value;
      const age = document.getElementById("age").value;
      const dob = document.getElementById("dob").value;
      const symptoms = document.getElementById("symptoms").value;

      console.log("New patient:", { name, age, dob, symptoms });

      status.textContent = "Patient added to triage successfully!";
      form.reset();
    });
  }
});
