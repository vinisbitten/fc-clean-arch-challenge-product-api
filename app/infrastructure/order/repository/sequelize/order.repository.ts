import Order from "../../../../domain/checkout/entity/order";
import OrderItem from "../../../../domain/checkout/entity/order-item";
import OrderItemModel from "../../../database/sequelize/model/order-item.model";
import OrderModel from "../../../database/sequelize/model/order.model";
import OrderRepositoryInterface from "../../../../domain/checkout/repository/order-repository.interface";

export default class OrderRepository implements OrderRepositoryInterface {
  async create(order: Order): Promise<void> {
    await OrderModel.create(
      {
        id: order.id,
        customer_id: order.customerId,
        total: order.total(),
        items: order.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          product_id: item.productId,
          quantity: item.quantity,
        })),
      },
      {
        include: [{ model: OrderItemModel }],
      }
    );
  }

  async addOrderItem(order: Order, item: OrderItem): Promise<void> {
    await OrderItemModel.create({
      id: item.id,
      name: item.name,
      price: item.price,
      product_id: item.productId,
      quantity: item.quantity,
      order_id: order.id,
    });

    await OrderModel.update(
      {
        total: order.total(),
      },
      {
        where: { id: order.id },
      }
    );
  }

  async deleteOrderItem(order: Order, orderItem: OrderItem): Promise<void> {
    await OrderItemModel.destroy({
      where: { id: orderItem.id },
    });

    await OrderModel.update(
      {
        total: order.total(),
      },
      {
        where: { id: order.id },
      }
    );
  }

  async updateOrderItemQuantity(
    order: Order,
    orderItem: OrderItem
  ): Promise<void> {
    await OrderItemModel.update(
      {
        quantity: orderItem.quantity,
      },
      {
        where: { id: orderItem.id },
      }
    );

    await OrderModel.update(
      {
        total: order.total(),
      },
      {
        where: { id: order.id },
      }
    );
  }

  async update(order: Order): Promise<void> {
    const oldOrder = await OrderModel.findOne({
      where: { id: order.id },
      include: ["items"],
    });

    const oldOrderItems = oldOrder.items.map((item) => {
      return new OrderItem(
        item.id,
        item.name,
        item.price,
        item.product_id,
        item.quantity
      );
    });

    for (const item of oldOrderItems) {
      const match = order.items.find((i) => i.id === item.id);

      if (!match) {
        await this.deleteOrderItem(order, item);
      }
    }

    for (const item of order.items) {
      const match = oldOrderItems.find((i) => i.id === item.id);

      if (!match) {
        await this.addOrderItem(order, item);
      } else if (match.quantity !== item.quantity) {
        await this.updateOrderItemQuantity(order, item);
      }
    }

    await OrderModel.update(
      {
        id: order.id,
        customer_id: order.customerId,
        total: order.total(),
        items: order.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          product_id: item.productId,
          quantity: item.quantity,
        })),
      },
      {
        where: { id: order.id },
      }
    );
  }

  async find(id: string): Promise<Order> {
    const orderModel = await OrderModel.findOne({
      where: { id: id },
      include: ["items"],
    });

    const orderItems = orderModel.items.map((item) => {
      return new OrderItem(
        item.id,
        item.name,
        item.price,
        item.product_id,
        item.quantity
      );
    });

    const order = new Order(orderModel.id, orderModel.customer_id, orderItems);

    return order;
  }

  async findAll(): Promise<Order[]> {
    const orderModels = await OrderModel.findAll({
      include: ["items"],
    });

    const orders = orderModels.map((orderModel) => {
      const orderItems = orderModel.items.map((item) => {
        return new OrderItem(
          item.id,
          item.name,
          item.price,
          item.product_id,
          item.quantity
        );
      });

      const order = new Order(
        orderModel.id,
        orderModel.customer_id,
        orderItems
      );

      return order;
    });

    return orders;
  }
}
