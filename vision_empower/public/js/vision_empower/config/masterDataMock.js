// Local mock data for Master Data, matching the design spec's sample rows
// exactly. No Vendor/School/Item/Kit DocType exists yet — see
// CLAUDE.md — so these pages read from here rather than a real endpoint.
// Swap for real frappe.call() list/get calls once the DocTypes + API
// (feature/master-data, feature/custom-api) land, keeping the same shape.

export const VENDORS = [
	{ id: "VE-VEN-001", name: "Navneet Education Ltd", contact: "Anil Kamble", phone: "+91 98201 12345", email: "procurement@navneet.com", address: "Navneet House, Gurukul Road, Memnagar", city: "Ahmedabad", state: "Gujarat", gst: "27AAACN1234F1Z0", pan: "AAACN1234F", bank: "HDFC Bank", account: "50200012345678", ifsc: "HDFC0000006", categories: ["Books"], status: "Active" },
	{ id: "VE-VEN-002", name: "STEM Learning Pvt Ltd", contact: "Vikram Mehta", phone: "+91 98110 54321", email: "sales@stemlearning.in", address: "Tech Park, Sector 62", city: "Noida", state: "Uttar Pradesh", gst: "07AAACS5678D1Z2", pan: "AAACS5678D", bank: "ICICI Bank", account: "60300098765432", ifsc: "ICIC0000012", categories: ["STEM"], status: "Active" },
	{ id: "VE-VEN-003", name: "Braille India Pvt Ltd", contact: "Sunita Roy", phone: "+91 98450 98765", email: "orders@brailleindia.com", address: "Andheri Industrial Estate", city: "Mumbai", state: "Maharashtra", gst: "29AAACB9012A1ZY", pan: "AAACB9012A", bank: "SBI", account: "31400011122233", ifsc: "SBIN0000300", categories: ["Books", "CT"], status: "Active" },
	{ id: "VE-VEN-004", name: "Hindustan Medicals Ltd", contact: "Ramesh Sen", phone: "+91 98900 11111", email: "supply@hindustanmedicals.com", address: "Medical Supplies Complex", city: "Kolkata", state: "West Bengal", gst: "19AAACH2345B1ZF", pan: "AAACH2345B", bank: "Axis Bank", account: "91200055566677", ifsc: "UTIB0000091", categories: ["Lab"], status: "Active" },
	{ id: "VE-VEN-005", name: "Apex Educational Supplies", contact: "Sanjay Gupta", phone: "+91 98300 22222", email: "info@apexedu.in", address: "Connaught Place", city: "Delhi", state: "Delhi", gst: "19AAACA6789C1ZG", pan: "AAACA6789C", bank: "HDFC Bank", account: "50100088899900", ifsc: "HDFC0000019", categories: ["Books", "CT", "STEM"], status: "Active" },
	{ id: "VE-VEN-006", name: "Reliance Digital NGO", contact: "Pooja Patel", phone: "+91 98760 33333", email: "csr@reliancedigital.in", address: "BKC", city: "Mumbai", state: "Maharashtra", gst: "24AAACR1234G1ZE", pan: "AAACR1234G", bank: "SBI", account: "31400099988877", ifsc: "SBIN0000024", categories: ["IT"], status: "Active" },
	{ id: "VE-VEN-007", name: "Srinivasa Logistics", contact: "Y. Reddy", phone: "+91 99000 44444", email: "ops@srinivasalog.com", address: "Industrial Area Phase 2", city: "Hyderabad", state: "Telangana", gst: "36AAACS4567H1ZD", pan: "AAACS4567H", bank: "Axis Bank", account: "91200066677788", ifsc: "UTIB0000036", categories: ["CT"], status: "Active" },
	{ id: "VE-VEN-008", name: "BioGen Lab Instruments", contact: "Amit Shah", phone: "+91 98120 55555", email: "sales@biogenlab.com", address: "GIDC Estate", city: "Ahmedabad", state: "Gujarat", gst: "27AAACB0987K1Z8", pan: "AAACB0987K", bank: "HDFC Bank", account: "50200077788899", ifsc: "HDFC0000027", categories: ["Lab"], status: "Inactive" },
];

export const VENDOR_ITEMS = {
	"VE-VEN-001": [
		{ id: "VE-ITM-101", name: "Primary Math Textbooks (Class 1-5 Set)", price: "₹245.00" },
		{ id: "VE-ITM-102", name: "English Grammar Workbook (Class 3)", price: "₹120.00" },
		{ id: "VE-ITM-103", name: "EVS Science Activity Guidebook", price: "₹185.00" },
		{ id: "VE-ITM-104", name: "Hindi Vyakaran Book Set", price: "₹150.00" },
	],
};

export const SCHOOLS = [
	{ id: "VE-SCH-001", name: "Govt. Primary School, Patna", state: "Bihar", district: "Patna", contact: "Rajesh Kumar", phone: "+91 94310 12345", email: "gps.patna@biharedu.in", type: "Govt", capacity: 320, spoc: "Rajesh Kumar (rajesh.k@visionempower.org)", address: "Near Gandhi Maidan, Fraser Road Area" },
	{ id: "VE-SCH-002", name: "Blind School, Dehradun", state: "Uttarakhand", district: "Dehradun", contact: "Sunita Negi", phone: "+91 94120 54321", email: "office@blindschool-ddn.org", type: "Private", capacity: 120, spoc: "Sunita Negi (sunita.n@visionempower.org)", address: "Rajpur Road" },
	{ id: "VE-SCH-003", name: "Kasturba Gandhi Balika Vidyalaya", state: "Jharkhand", district: "Ranchi", contact: "Manju Soren", phone: "+91 94701 98765", email: "kgbv.ranchi@jhedu.in", type: "Govt", capacity: 250, spoc: "Manju Soren (manju.s@visionempower.org)", address: "Ratu Road" },
	{ id: "VE-SCH-004", name: "Govt. Model Senior Sec School", state: "Punjab", district: "Amritsar", contact: "Harpreet Singh", phone: "+91 94170 11111", email: "gmsss.asr@pbedu.in", type: "Govt", capacity: 450, spoc: "Harpreet Singh (harpreet.s@visionempower.org)", address: "Mall Road" },
	{ id: "VE-SCH-005", name: "Netarhat Residential School", state: "Jharkhand", district: "Latehar", contact: "A. K. Prasad", phone: "+91 94311 22222", email: "netarhat.rs@jhedu.in", type: "Govt", capacity: 500, spoc: "A. K. Prasad (ak.prasad@visionempower.org)", address: "Netarhat Hills" },
	{ id: "VE-SCH-006", name: "Saraswati Shishu Mandir", state: "Madhya Pradesh", district: "Bhopal", contact: "Devendra Patel", phone: "+91 94250 33333", email: "ssm.bhopal@mpedu.in", type: "Private", capacity: 380, spoc: "Devendra Patel (devendra.p@visionempower.org)", address: "Arera Colony" },
	{ id: "VE-SCH-007", name: "Govt. Girls High School", state: "Odisha", district: "Cuttack", contact: "Lopamudra Das", phone: "+91 94370 44444", email: "ggh.cuttack@orissaedu.in", type: "Govt", capacity: 280, spoc: "Lopamudra Das (lopamudra.d@visionempower.org)", address: "Link Road" },
	{ id: "VE-SCH-008", name: "Ambedkar Memorial School", state: "Maharashtra", district: "Pune", contact: "Siddharth Kamble", phone: "+91 94220 55555", email: "ams.pune@maharashtraedu.in", type: "Private", capacity: 200, spoc: "Siddharth Kamble (siddharth.k@visionempower.org)", address: "Kothrud" },
];

export const SCHOOL_DISPATCHES = {
	"VE-SCH-001": [
		{ dc: "DC-2024-482", date: "12 Sep 2024", items: "Primary Math Textbooks (Class 1-5)", qty: "320 Sets", status: "Completed" },
		{ dc: "DC-2024-510", date: "05 Oct 2024", items: "Solar Lanterns (Heavy Duty)", qty: "30 Units", status: "In Transit" },
		{ dc: "DC-2024-544", date: "15 Oct 2024", items: "First-Aid Kits (Grade A)", qty: "12 Kits", status: "Pending" },
	],
};

export const ITEMS = [
	{ id: "VE-ITM-011", name: "Braille Slate & Stylus Set", category: "Braille", unit: "Set", vendor: "Braille India Pvt Ltd", norm: "5 Sets", price: "₹450.00" },
	{ id: "VE-ITM-012", name: "Solar Lantern 5W with Charger", category: "STEM", unit: "Nos", vendor: "STEM Learning Pvt Ltd", norm: "2 Nos", price: "₹1,200.00" },
	{ id: "VE-ITM-013", name: "STEM Robotics Kit Grade 6", category: "STEM", unit: "Kit", vendor: "STEM Learning Pvt Ltd", norm: "1 Kit", price: "₹4,850.00" },
	{ id: "VE-ITM-014", name: "First-Aid Kit Grade A (Govt Norm)", category: "Lab", unit: "Pack", vendor: "Hindustan Medicals Ltd", norm: "1 Pack", price: "₹850.00" },
	{ id: "VE-ITM-015", name: "NCERT Primary Science Textbooks", category: "Books", unit: "Set", vendor: "Navneet Education Ltd", norm: "45 Sets", price: "₹380.00" },
	{ id: "VE-ITM-016", name: "Visual Classroom Projector Pro", category: "IT", unit: "Nos", vendor: "Reliance Digital NGO", norm: "1 Nos", price: "₹24,500.00" },
	{ id: "VE-ITM-017", name: "Geography Relief Map Globe", category: "CT", unit: "Nos", vendor: "Apex Educational Supplies", norm: "3 Nos", price: "₹1,450.00" },
	{ id: "VE-ITM-018", name: "Mathematical Geometry Board Set", category: "STEM", unit: "Set", vendor: "STEM Learning, Apex Supplies", norm: "10 Sets", price: "₹750.00" },
];

export const ITEM_VENDOR_HISTORY = {
	"VE-ITM-011": [
		{ id: "VE-VEN-003", name: "Braille India Pvt Ltd", location: "Mumbai Warehouse", price: "₹450.00", date: "12-Jan-2026", status: "Preferred", confidence: "High" },
		{ id: "VE-VEN-005", name: "Apex Educational Supplies", location: "Delhi Hub", price: "₹475.00", date: "04-Nov-2025", status: "", confidence: "Med" },
		{ id: "VE-VEN-008", name: "National Association for the Blind (NAB)", location: "Bengaluru Store", price: "₹440.00", date: "18-Aug-2025", status: "", confidence: "Low" },
	],
};

export const KITS = [
	{ id: "VE-KIT-001", name: "Primary Math Learning Kit (Class 1-5)", itemCount: 12, vendor: "STEM Learning Pvt Ltd", schoolType: "Govt", value: "₹6,850.00" },
	{ id: "VE-KIT-002", name: "Secondary Physics Lab Setup Kit", itemCount: 24, vendor: "Apex Educational Supplies", schoolType: "Govt", value: "₹24,500.00" },
	{ id: "VE-KIT-003", name: "CT Learning Kit — Primary", itemCount: 6, vendor: "STEM Learning Pvt Ltd", schoolType: "Govt", value: "₹12,450.00" },
	{ id: "VE-KIT-004", name: "Braille Special Resource Kit Pro", itemCount: 15, vendor: "Braille India Pvt Ltd", schoolType: "Both", value: "₹18,750.00" },
	{ id: "VE-KIT-005", name: "IT Essentials Lab Kit Grade 9-10", itemCount: 8, vendor: "Reliance Digital NGO", schoolType: "Private", value: "₹72,400.00" },
	{ id: "VE-KIT-006", name: "Classroom Hygiene & First-Aid Kit", itemCount: 5, vendor: "Hindustan Medicals Ltd", schoolType: "Both", value: "₹3,200.00" },
];

export const KIT_ITEMS = {
	"VE-KIT-003": [
		{ id: "VE-ITM-031", name: "Primary Math Geometry Board", unit: "Set", qty: 1, price: 750, vendor: "Braille India Pvt Ltd" },
		{ id: "VE-ITM-032", name: "Desktop Abacus 10-Row", unit: "Nos", qty: 2, price: 450, vendor: "Apex Educational Supplies" },
		{ id: "VE-ITM-033", name: "Visual Fraction Blocks Set", unit: "Set", qty: 1, price: 1250, vendor: "National Assoc. Blind" },
		{ id: "VE-ITM-034", name: "Brain Booster Puzzle (Primary)", unit: "Nos", qty: 5, price: 350, vendor: "Braille India Pvt Ltd" },
		{ id: "VE-ITM-035", name: "Magnetic Learning Alphabets Kit", unit: "Kit", qty: 2, price: 1400, vendor: "Apex Educational Supplies" },
		{ id: "VE-ITM-036", name: "Solar System Relief Globe Model", unit: "Nos", qty: 1, price: 5000, vendor: "National Assoc. Blind" },
	],
};

export const CATEGORY_BADGE = {
	Books: "blue",
	STEM: "teal",
	CT: "orange",
	Lab: "purple",
	IT: "pink",
	Braille: "indigo",
	Govt: "blue",
	Private: "pink",
	Both: "gray",
};

export function formatInr(amount) {
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		maximumFractionDigits: 0,
	}).format(amount);
}

// Local-only ID generator for records created through the mock-data
// Create forms (Vendor/School/Item/Kit) — mirrors the "VE-XXX-NNN"
// pattern of the seeded rows. Replace with whatever the real DocType
// naming series produces once these are backed by real endpoints.
export function nextMockId(list, prefix) {
	const max = list.reduce((highest, row) => {
		const n = parseInt(row.id.split("-").pop(), 10);
		return Number.isFinite(n) && n > highest ? n : highest;
	}, 0);
	return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}
