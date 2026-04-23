const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with wallet:", deployer.address);

  const DiplomaRegistry = await ethers.getContractFactory("DiplomaRegistry");
  const diplomaRegistry = await DiplomaRegistry.deploy();
  await diplomaRegistry.waitForDeployment();
  const diplomaAddress = await diplomaRegistry.getAddress();
  console.log("DiplomaRegistry deployed at:", diplomaAddress);

  const InternshipRegistry = await ethers.getContractFactory("InternshipRegistry");
  const internshipRegistry = await InternshipRegistry.deploy();
  await internshipRegistry.waitForDeployment();
  const internshipAddress = await internshipRegistry.getAddress();
  console.log("InternshipRegistry deployed at:", internshipAddress);

  const StudyCertificateRegistry = await ethers.getContractFactory("StudyCertificateRegistry");
  const studyRegistry = await StudyCertificateRegistry.deploy();
  await studyRegistry.waitForDeployment();
  const studyAddress = await studyRegistry.getAddress();
  console.log("StudyCertificateRegistry deployed at:", studyAddress);

  const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
  const documentRegistry = await DocumentRegistry.deploy();
  await documentRegistry.waitForDeployment();
  const documentAddress = await documentRegistry.getAddress();
  console.log("DocumentRegistry deployed at:", documentAddress);

  console.log(`DIPLOMA_CONTRACT_ADDRESS=${diplomaAddress}`);
  console.log(`INTERNSHIP_CONTRACT_ADDRESS=${internshipAddress}`);
  console.log(`STUDY_CONTRACT_ADDRESS=${studyAddress}`);
  console.log(`DOCUMENT_CONTRACT_ADDRESS=${documentAddress}`);

  await diplomaRegistry.authorizeSchool(deployer.address, "ENSTA");
  await internshipRegistry.authorizeSchool(deployer.address, "ENSTA");
  await studyRegistry.authorizeSchool(deployer.address, "ENSTA");
  await documentRegistry.authorizeSchool(deployer.address, "ENSTA");
  console.log("\nSchool wallet authorized on all 4 contracts.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});