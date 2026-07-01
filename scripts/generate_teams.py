"""
generate_teams.py
Generates team_roster.json with 20 teams and ~250 engineers.
Run: python scripts/generate_teams.py
"""

import json
import random
from pathlib import Path

rng = random.Random(42)

TEAMS = [
    {
        "team_id": "TEAM-01", "name": "Cloud Ops",
        "service_instances": ["Network/Infrastructure", "Microsoft 365"],
        "size": 15
    },
    {
        "team_id": "TEAM-02", "name": "Salesforce Admin",
        "service_instances": ["Salesforce"],
        "size": 12
    },
    {
        "team_id": "TEAM-03", "name": "API Gateway Team",
        "service_instances": ["WSO2 API Gateway"],
        "size": 10
    },
    {
        "team_id": "TEAM-04", "name": "Claims Platform",
        "service_instances": ["Guidewire ClaimCenter"],
        "size": 14
    },
    {
        "team_id": "TEAM-05", "name": "Policy Platform",
        "service_instances": ["Guidewire PolicyCenter"],
        "size": 14
    },
    {
        "team_id": "TEAM-06", "name": "Duck Creek Engineering",
        "service_instances": ["Duck Creek"],
        "size": 12
    },
    {
        "team_id": "TEAM-07", "name": "SAP Basis",
        "service_instances": ["SAP ECC/S4HANA"],
        "size": 13
    },
    {
        "team_id": "TEAM-08", "name": "M365 Support",
        "service_instances": ["Microsoft 365"],
        "size": 12
    },
    {
        "team_id": "TEAM-09", "name": "ITSM Platform Support",
        "service_instances": ["ServiceNow"],
        "size": 10
    },
    {
        "team_id": "TEAM-10", "name": "ERP Support",
        "service_instances": ["Oracle EBS"],
        "size": 12
    },
    {
        "team_id": "TEAM-11", "name": "Data Integration",
        "service_instances": ["Informatica/ETL"],
        "size": 11
    },
    {
        "team_id": "TEAM-12", "name": "IAM Security",
        "service_instances": ["Active Directory/IAM"],
        "size": 12
    },
    {
        "team_id": "TEAM-13", "name": "Network Engineering",
        "service_instances": ["Network/Infrastructure"],
        "size": 14
    },
    {
        "team_id": "TEAM-14", "name": "HEAL Engineering",
        "service_instances": ["HEAL"],
        "size": 13
    },
    {
        "team_id": "TEAM-15", "name": "Database Admin",
        "service_instances": ["SAP ECC/S4HANA", "Oracle EBS", "Informatica/ETL"],
        "size": 10
    },
    {
        "team_id": "TEAM-16", "name": "App Security",
        "service_instances": ["Active Directory/IAM", "Network/Infrastructure", "WSO2 API Gateway"],
        "size": 8
    },
    {
        "team_id": "TEAM-17", "name": "Change Management",
        "service_instances": ["ServiceNow", "Salesforce"],
        "size": 10
    },
    {
        "team_id": "TEAM-18", "name": "Incident Command",
        "service_instances": ["Network/Infrastructure", "ServiceNow"],
        "size": 8
    },
    {
        "team_id": "TEAM-19", "name": "L1 Service Desk",
        "service_instances": ["Salesforce", "Microsoft 365", "ServiceNow", "Active Directory/IAM"],
        "size": 20
    },
    {
        "team_id": "TEAM-20", "name": "Release Engineering",
        "service_instances": ["Salesforce", "Guidewire ClaimCenter", "Guidewire PolicyCenter", "Duck Creek", "SAP ECC/S4HANA"],
        "size": 10
    },
]

FIRST_NAMES = [
    "Aarav", "Aditi", "Amit", "Ananya", "Anil", "Anjali", "Arjun", "Bhavna",
    "Chetan", "Deepa", "Dhruv", "Divya", "Gaurav", "Harini", "Isha", "Jayesh",
    "Karan", "Kavita", "Lakshmi", "Manish", "Meera", "Mohan", "Nandini", "Naveen",
    "Neha", "Nikhil", "Pallavi", "Pankaj", "Pooja", "Pradeep", "Pranav", "Priya",
    "Rahul", "Rajesh", "Rakesh", "Ramya", "Ravi", "Rekha", "Rohit", "Sakshi",
    "Sandeep", "Sanjay", "Sapna", "Sharath", "Shikha", "Shreya", "Siddharth", "Simran",
    "Sneha", "Sunil", "Suresh", "Swati", "Tanvi", "Tushar", "Uma", "Varun",
    "Vidya", "Vijay", "Vinay", "Vinod", "Vivek", "Yamini", "Yogesh", "Zoya",
    "Abhishek", "Akshay", "Arun", "Ashwin", "Bharat", "Chandni", "Darshan", "Esha",
    "Farah", "Ganesh", "Hemant", "Indira", "Jatin", "Kishore", "Lavanya", "Madhav",
    "Naren", "Omkar", "Preeti", "Raghu", "Sahil", "Tanya", "Uday", "Vandana",
    "Wasim", "Xavier", "Yasmin", "Zeeshan", "Ajay", "Bhanu", "Chandra", "Devika"
]

LAST_NAMES = [
    "Sharma", "Patel", "Kumar", "Singh", "Reddy", "Nair", "Gupta", "Joshi",
    "Iyer", "Menon", "Rao", "Desai", "Verma", "Pillai", "Shah", "Mishra",
    "Agarwal", "Bhat", "Chopra", "Das", "Fernandes", "Goyal", "Hegde", "Iyengar",
    "Jain", "Kapoor", "Kulkarni", "Lal", "Mehta", "Nambiar", "Pandey", "Rajan",
    "Saxena", "Thakur", "Unnikrishnan", "Venkatesh", "Yadav", "Trivedi", "Srinivasan",
    "Bhattacharya", "Chatterjee", "Deshpande", "Ghosh", "Khanna", "Malhotra", "Mukherjee"
]

SENIORITY_LEVELS = ["Junior", "Mid", "Senior", "Lead"]
SENIORITY_WEIGHTS = [0.2, 0.4, 0.3, 0.1]
STATUS_OPTIONS = ["Available", "Busy", "On Leave"]
STATUS_WEIGHTS = [0.6, 0.3, 0.1]


def generate_name(used_names: set) -> str:
    for _ in range(100):
        name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
        if name not in used_names:
            used_names.add(name)
            return name
    return f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)} {rng.randint(1,99)}"


def generate_email(name: str) -> str:
    parts = name.lower().split()
    return f"{parts[0]}.{parts[-1]}@vitalops-insurance.com"


def main():
    used_names: set[str] = set()
    roster = {"teams": {}}

    for team_def in TEAMS:
        members = []
        for _ in range(team_def["size"]):
            name = generate_name(used_names)
            seniority = rng.choices(SENIORITY_LEVELS, SENIORITY_WEIGHTS)[0]
            status = rng.choices(STATUS_OPTIONS, STATUS_WEIGHTS)[0]
            current_load = 0 if status == "On Leave" else rng.randint(0, 8)

            members.append({
                "name": name,
                "email": generate_email(name),
                "seniority": seniority,
                "specializations": team_def["service_instances"],
                "status": status,
                "current_load": current_load,
            })

        roster["teams"][team_def["name"]] = {
            "team_id": team_def["team_id"],
            "service_instances": team_def["service_instances"],
            "members": members,
        }

    total = sum(len(t["members"]) for t in roster["teams"].values())
    out = Path(__file__).parent / "data" / "team_roster.json"
    out.write_text(json.dumps(roster, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Generated {total} engineers across {len(roster['teams'])} teams -> {out}")


if __name__ == "__main__":
    main()
