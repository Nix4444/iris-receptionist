import { prismaClient } from "./index";
async function seed(){
    await prismaClient.appointment.create({
        data: {
            id: "4",
            name: "John Doe",
            phone: "12345678900",
            reason: "fever",
            time: new Date("2024-02-29T19:30:00+05:30")
        },
    });

}

seed()