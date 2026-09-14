/**
 * Bangladesh districts (zilla) and upazilas — seed reference data (AD-254).
 *
 * District names/count (64) are stable and high-confidence. Upazila lists
 * are best-effort from general knowledge, not cross-checked against an
 * official BBS/LGD source today — a few upazilas may be missing, renamed,
 * or (rarely) newly created since. Treat this as a strong starting point;
 * add/correct entries via Admin → Shipping → Districts as needed.
 *
 * "dhaka" district maps to the dhaka_metro ShippingZone; every other
 * district maps to outside_dhaka.
 */

export type DistrictSeed = {
  name: string;
  upazilas: string[];
};

export const BD_DISTRICTS_SEED: DistrictSeed[] = [
  // Dhaka Division
  { name: "Dhaka", upazilas: ["Dhamrai", "Dohar", "Keraniganj", "Nawabganj", "Savar"] },
  { name: "Faridpur", upazilas: ["Alfadanga", "Bhanga", "Boalmari", "Charbhadrasan", "Faridpur Sadar", "Madhukhali", "Nagarkanda", "Sadarpur", "Saltha"] },
  { name: "Gazipur", upazilas: ["Gazipur Sadar", "Kaliakair", "Kaliganj", "Kapasia", "Sreepur"] },
  { name: "Gopalganj", upazilas: ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"] },
  { name: "Kishoreganj", upazilas: ["Austagram", "Bajitpur", "Bhairab", "Hossainpur", "Itna", "Karimganj", "Katiadi", "Kishoreganj Sadar", "Kuliarchar", "Mithamain", "Nikli", "Pakundia", "Tarail"] },
  { name: "Madaripur", upazilas: ["Kalkini", "Madaripur Sadar", "Rajoir", "Shibchar"] },
  { name: "Manikganj", upazilas: ["Daulatpur", "Ghior", "Harirampur", "Manikganj Sadar", "Saturia", "Shibalaya", "Singair"] },
  { name: "Munshiganj", upazilas: ["Gazaria", "Lohajang", "Munshiganj Sadar", "Sirajdikhan", "Sreenagar", "Tongibari"] },
  { name: "Narayanganj", upazilas: ["Araihazar", "Bandar", "Narayanganj Sadar", "Rupganj", "Sonargaon"] },
  { name: "Narsingdi", upazilas: ["Belabo", "Monohardi", "Narsingdi Sadar", "Palash", "Raipura", "Shibpur"] },
  { name: "Rajbari", upazilas: ["Baliakandi", "Goalandaghat", "Pangsha", "Rajbari Sadar", "Kalukhali"] },
  { name: "Shariatpur", upazilas: ["Bhedarganj", "Damudya", "Gosairhat", "Naria", "Shariatpur Sadar", "Zajira"] },
  { name: "Tangail", upazilas: ["Basail", "Bhuapur", "Delduar", "Dhanbari", "Ghatail", "Gopalpur", "Kalihati", "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur", "Tangail Sadar"] },

  // Chattogram Division
  { name: "Bandarban", upazilas: ["Alikadam", "Bandarban Sadar", "Lama", "Naikhongchhari", "Rowangchhari", "Ruma", "Thanchi"] },
  { name: "Brahmanbaria", upazilas: ["Akhaura", "Bancharampur", "Brahmanbaria Sadar", "Kasba", "Nabinagar", "Nasirnagar", "Sarail", "Ashuganj", "Bijoynagar"] },
  { name: "Chandpur", upazilas: ["Chandpur Sadar", "Faridganj", "Haimchar", "Haziganj", "Kachua", "Matlab Dakshin", "Matlab Uttar", "Shahrasti"] },
  { name: "Chattogram", upazilas: ["Anwara", "Banshkhali", "Boalkhali", "Chandanaish", "Fatikchhari", "Hathazari", "Lohagara", "Mirsharai", "Patiya", "Rangunia", "Raozan", "Sandwip", "Satkania", "Sitakunda"] },
  { name: "Cumilla", upazilas: ["Barura", "Brahmanpara", "Burichang", "Chandina", "Chauddagram", "Daudkandi", "Debidwar", "Homna", "Laksam", "Cumilla Sadar", "Meghna", "Muradnagar", "Nangalkot", "Titas", "Monohorgonj"] },
  { name: "Cox's Bazar", upazilas: ["Chakaria", "Cox's Bazar Sadar", "Kutubdia", "Maheshkhali", "Pekua", "Ramu", "Teknaf", "Ukhia"] },
  { name: "Feni", upazilas: ["Chhagalnaiya", "Daganbhuiyan", "Feni Sadar", "Fulgazi", "Parshuram", "Sonagazi"] },
  { name: "Khagrachhari", upazilas: ["Dighinala", "Khagrachhari Sadar", "Lakshmichhari", "Mahalchhari", "Manikchhari", "Matiranga", "Panchhari", "Ramgarh"] },
  { name: "Lakshmipur", upazilas: ["Kamalnagar", "Lakshmipur Sadar", "Raipur", "Ramganj", "Ramgati"] },
  { name: "Noakhali", upazilas: ["Begumganj", "Chatkhil", "Companiganj", "Hatiya", "Kabirhat", "Noakhali Sadar", "Senbagh", "Sonaimuri", "Subarnachar"] },
  { name: "Rangamati", upazilas: ["Baghaichhari", "Barkal", "Belaichhari", "Juraichhari", "Kaptai", "Kawkhali", "Langadu", "Naniarchar", "Rajasthali", "Rangamati Sadar"] },

  // Rajshahi Division
  { name: "Bogura", upazilas: ["Adamdighi", "Bogura Sadar", "Dhunat", "Dhupchanchia", "Gabtali", "Kahaloo", "Nandigram", "Sariakandi", "Shajahanpur", "Sherpur", "Shibganj", "Sonatola"] },
  { name: "Joypurhat", upazilas: ["Akkelpur", "Joypurhat Sadar", "Kalai", "Khetlal", "Panchbibi"] },
  { name: "Naogaon", upazilas: ["Atrai", "Badalgachhi", "Dhamoirhat", "Manda", "Mahadebpur", "Naogaon Sadar", "Niamatpur", "Patnitala", "Porsha", "Raninagar", "Sapahar"] },
  { name: "Natore", upazilas: ["Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Natore Sadar", "Singra"] },
  { name: "Chapainawabganj", upazilas: ["Bholahat", "Gomastapur", "Nachole", "Chapainawabganj Sadar", "Shibganj"] },
  { name: "Pabna", upazilas: ["Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishwardi", "Pabna Sadar", "Santhia", "Sujanagar"] },
  { name: "Rajshahi", upazilas: ["Bagha", "Bagmara", "Charghat", "Durgapur", "Godagari", "Mohanpur", "Paba", "Puthia", "Tanore"] },
  { name: "Sirajganj", upazilas: ["Belkuchi", "Chauhali", "Kamarkhanda", "Kazipur", "Raiganj", "Shahjadpur", "Sirajganj Sadar", "Tarash", "Ullapara"] },

  // Khulna Division
  { name: "Bagerhat", upazilas: ["Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla", "Morrelganj", "Rampal", "Sarankhola"] },
  { name: "Chuadanga", upazilas: ["Alamdanga", "Chuadanga Sadar", "Damurhuda", "Jibannagar"] },
  { name: "Jashore", upazilas: ["Abhaynagar", "Bagherpara", "Chaugachha", "Jhikargachha", "Jashore Sadar", "Keshabpur", "Manirampur", "Sharsha"] },
  { name: "Jhenaidah", upazilas: ["Harinakunda", "Jhenaidah Sadar", "Kaliganj", "Kotchandpur", "Maheshpur", "Shailkupa"] },
  { name: "Khulna", upazilas: ["Batiaghata", "Dacope", "Dumuria", "Dighalia", "Koyra", "Paikgachha", "Phultala", "Rupsa", "Terokhada"] },
  { name: "Kushtia", upazilas: ["Bheramara", "Daulatpur", "Khoksa", "Kumarkhali", "Kushtia Sadar", "Mirpur"] },
  { name: "Magura", upazilas: ["Magura Sadar", "Mohammadpur", "Shalikha", "Sreepur"] },
  { name: "Meherpur", upazilas: ["Gangni", "Meherpur Sadar", "Mujibnagar"] },
  { name: "Narail", upazilas: ["Kalia", "Lohagara", "Narail Sadar"] },
  { name: "Satkhira", upazilas: ["Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Satkhira Sadar", "Shyamnagar", "Tala"] },

  // Barishal Division
  { name: "Barguna", upazilas: ["Amtali", "Bamna", "Barguna Sadar", "Betagi", "Patharghata", "Taltali"] },
  { name: "Barishal", upazilas: ["Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Barishal Sadar", "Gaurnadi", "Hizla", "Mehendiganj", "Muladi", "Wazirpur"] },
  { name: "Bhola", upazilas: ["Bhola Sadar", "Burhanuddin", "Char Fasson", "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin"] },
  { name: "Jhalokati", upazilas: ["Jhalokati Sadar", "Kathalia", "Nalchity", "Rajapur"] },
  { name: "Patuakhali", upazilas: ["Bauphal", "Dashmina", "Dumki", "Galachipa", "Kalapara", "Mirzaganj", "Patuakhali Sadar", "Rangabali"] },
  { name: "Pirojpur", upazilas: ["Bhandaria", "Kawkhali", "Mathbaria", "Nazirpur", "Pirojpur Sadar", "Nesarabad", "Zianagar"] },

  // Sylhet Division
  { name: "Habiganj", upazilas: ["Ajmiriganj", "Bahubal", "Baniachong", "Chunarughat", "Habiganj Sadar", "Lakhai", "Madhabpur", "Nabiganj", "Shayestaganj"] },
  { name: "Moulvibazar", upazilas: ["Barlekha", "Juri", "Kamalganj", "Kulaura", "Moulvibazar Sadar", "Rajnagar", "Sreemangal"] },
  { name: "Sunamganj", upazilas: ["Bishwamvarpur", "Chhatak", "Derai", "Dharmapasha", "Dowarabazar", "Jagannathpur", "Jamalganj", "Sullah", "Sunamganj Sadar", "Tahirpur", "Shantiganj"] },
  { name: "Sylhet", upazilas: ["Balaganj", "Beanibazar", "Bishwanath", "Companiganj", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Osmani Nagar", "Sylhet Sadar", "Zakiganj"] },

  // Rangpur Division
  { name: "Dinajpur", upazilas: ["Birampur", "Birganj", "Biral", "Bochaganj", "Chirirbandar", "Dinajpur Sadar", "Fulbari", "Ghoraghat", "Hakimpur", "Kaharole", "Khansama", "Nawabganj", "Parbatipur"] },
  { name: "Gaibandha", upazilas: ["Fulchhari", "Gaibandha Sadar", "Gobindaganj", "Palashbari", "Sadullapur", "Saghata", "Sundarganj"] },
  { name: "Kurigram", upazilas: ["Bhurungamari", "Char Rajibpur", "Chilmari", "Kurigram Sadar", "Nageshwari", "Phulbari", "Rajarhat", "Raomari", "Ulipur"] },
  { name: "Lalmonirhat", upazilas: ["Aditmari", "Hatibandha", "Kaliganj", "Lalmonirhat Sadar", "Patgram"] },
  { name: "Nilphamari", upazilas: ["Dimla", "Domar", "Jaldhaka", "Kishoreganj", "Nilphamari Sadar", "Saidpur"] },
  { name: "Panchagarh", upazilas: ["Atwari", "Boda", "Debiganj", "Panchagarh Sadar", "Tetulia"] },
  { name: "Rangpur", upazilas: ["Badarganj", "Gangachara", "Kaunia", "Mithapukur", "Pirgachha", "Pirganj", "Rangpur Sadar", "Taraganj"] },
  { name: "Thakurgaon", upazilas: ["Baliadangi", "Haripur", "Pirganj", "Ranisankail", "Thakurgaon Sadar"] },

  // Mymensingh Division
  { name: "Jamalpur", upazilas: ["Bakshiganj", "Dewanganj", "Islampur", "Jamalpur Sadar", "Madarganj", "Melandaha", "Sarishabari"] },
  { name: "Mymensingh", upazilas: ["Bhaluka", "Dhobaura", "Fulbaria", "Gaffargaon", "Gauripur", "Haluaghat", "Ishwarganj", "Mymensingh Sadar", "Muktagachha", "Nandail", "Phulpur", "Trishal", "Tara Khanda"] },
  { name: "Netrokona", upazilas: ["Atpara", "Barhatta", "Durgapur", "Kalmakanda", "Kendua", "Khaliajuri", "Madan", "Mohanganj", "Netrokona Sadar", "Purbadhala"] },
  { name: "Sherpur", upazilas: ["Jhenaigati", "Nakla", "Nalitabari", "Sherpur Sadar", "Sreebardi"] },
];
