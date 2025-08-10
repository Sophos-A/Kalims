// Script to create a test staff account for the KALIMS system

// Default staff credentials
const defaultStaffUser = {
    username: 'teststaff',
    email: 'teststaff@example.com',
    password: 'password123',
    staffId: 'STAFF001',
    department: 'Administration',
    createdAt: new Date().toISOString()
};

// Function to add the default staff user to localStorage
function createTestStaffAccount() {
    // Get existing staff users or initialize empty array
    const staffUsers = JSON.parse(localStorage.getItem('staffUsers')) || [];
    
    // Check if test user already exists
    const existingUser = staffUsers.find(user => user.username === defaultStaffUser.username);
    
    if (existingUser) {
        console.log('Test staff account already exists!');
        console.log('Username:', defaultStaffUser.username);
        console.log('Password:', defaultStaffUser.password);
        return;
    }
    
    // Add the default user
    staffUsers.push(defaultStaffUser);
    
    // Save back to localStorage
    localStorage.setItem('staffUsers', JSON.stringify(staffUsers));
    
    console.log('Test staff account created successfully!');
    console.log('Username:', defaultStaffUser.username);
    console.log('Password:', defaultStaffUser.password);
}

// Execute the function
createTestStaffAccount();

console.log('\nTo use this account, go to the staff portal at: staff.html');