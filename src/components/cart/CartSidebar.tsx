import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Minus, Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { EditCartItemDialog } from "./EditCartItemDialog";
import { useState } from "react";

export const CartSidebar = () => {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, getTotal, getItemCount, updateCartItem } = useCart();
  const [editingItem, setEditingItem] = useState<any>(null);
  const itemCount = getItemCount();
  const deliveryFee = 5;
  const total = getTotal() + (itemCount > 0 ? deliveryFee : 0);

  return (
    <div className="hidden lg:block lg:col-span-1">
      <Card className="sticky top-24">
        <CardContent className="p-6">
          {itemCount === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <ShoppingCart className="w-24 h-24 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-medium text-muted-foreground mb-8">
                Carrinho está vazio
              </p>
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
                disabled
              >
                Concluir pedido
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xl font-bold mb-4">Seu Carrinho</h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {cart.items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="border rounded-lg p-3"
                  >
                    <div className="flex gap-3">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">
                          {item.productName}
                        </h4>
                        {item.flavors && item.flavors.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">Sabores:</span>
                            {item.flavors.map((flavor, idx) => (
                              <div key={idx} className="ml-1">• {flavor.name}</div>
                            ))}
                          </div>
                        )}
                        {item.addons && item.addons.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.addons.map((addon, idx) => (
                              <div key={idx}>+ {addon.name}</div>
                            ))}
                          </div>
                        )}
                        {item.observation && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            Obs: {item.observation}
                          </p>
                        )}
                        <p className="text-sm font-bold text-primary mt-1">
                          R$ {((item.promotionalPrice || item.price) + 
                            (item.addons?.reduce((sum, addon) => sum + addon.price, 0) || 0) +
                            (item.flavors?.reduce((sum, flavor) => sum + flavor.price, 0) || 0)).toFixed(2)}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-semibold">
                              {item.quantity}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => setEditingItem(item)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>R$ {getTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Taxa de entrega</span>
                  <span>R$ {deliveryFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
                onClick={() => navigate('/cart')}
              >
                Concluir pedido
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Item Dialog */}
      {editingItem && (
        <EditCartItemDialog
          item={editingItem}
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          onUpdate={updateCartItem}
        />
      )}
    </div>
  );
};
